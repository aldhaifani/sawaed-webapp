import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { auth } from "./auth";

/**
 * Messages API (MVP)
 * - Persist final user and assistant messages.
 * - Update parent conversation's lastMessageAt for ordering.
 */
export const addUserMessage = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    content: v.string(),
    metadataJson: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { conversationId, content, metadataJson },
  ): Promise<{ messageId: Id<"aiMessages">; questionCount: number } | null> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;

    const convo = await ctx.db.get(conversationId);
    if (!convo) return null;

    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || convo.userId !== (appUser._id as Id<"appUsers">)) {
      return null;
    }

    // Count existing assistant messages (questions) in this conversation
    const assistantMessages = await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .filter((q) => q.eq(q.field("role"), "assistant"))
      .collect();

    const questionCount = assistantMessages.length;

    const now = Date.now();

    const messageId = (await ctx.db.insert("aiMessages", {
      conversationId,
      role: "user",
      content,
      metadataJson,
      createdAt: now,
    })) as Id<"aiMessages">;

    await ctx.db.patch(conversationId, { lastMessageAt: now, updatedAt: now });

    return { messageId, questionCount };
  },
});

export const addAssistantMessage = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    content: v.string(),
    metadataJson: v.optional(v.string()),
    questionNumber: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { conversationId, content, metadataJson, questionNumber },
  ): Promise<{ messageId: Id<"aiMessages"> } | null> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;

    const convo = await ctx.db.get(conversationId);
    if (!convo) return null;

    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || convo.userId !== (appUser._id as Id<"appUsers">)) {
      return null;
    }

    const now = Date.now();

    const messageId = (await ctx.db.insert("aiMessages", {
      conversationId,
      role: "assistant",
      content,
      metadataJson,
      questionNumber,
      createdAt: now,
    })) as Id<"aiMessages">;

    await ctx.db.patch(conversationId, { lastMessageAt: now, updatedAt: now });

    return { messageId };
  },
});

export const listByConversation = query({
  args: { conversationId: v.id("aiConversations") },
  handler: async (
    ctx,
    { conversationId },
  ): Promise<
    ReadonlyArray<{
      readonly _id: Id<"aiMessages">;
      readonly conversationId: Id<"aiConversations">;
      readonly role: "user" | "assistant" | "system";
      readonly content: string;
      readonly metadataJson?: string;
      readonly createdAt: number;
    }>
  > => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return [];

    const convo = await ctx.db.get(conversationId);
    if (!convo) return [];

    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || convo.userId !== (appUser._id as Id<"appUsers">)) {
      return [];
    }

    const items = await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", conversationId),
      )
      .order("asc")
      .collect();

    return items.map((m) => ({
      _id: m._id as Id<"aiMessages">,
      conversationId: m.conversationId as Id<"aiConversations">,
      role: m.role,
      content: m.content,
      metadataJson: m.metadataJson ?? undefined,
      createdAt: m.createdAt,
    }));
  },
});
