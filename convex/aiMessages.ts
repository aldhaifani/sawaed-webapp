import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { auth } from "./auth";

/**
 * Messages API (MVP)
 * - Persist final user and assistant messages.
 * - Update parent conversation's lastMessageAt for ordering.
 * - Enforce strict 5-question limit per assessment.
 * - Track question numbers to prevent duplicates.
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
  ): Promise<{
    messageId: Id<"aiMessages">;
    questionCount: number;
    shouldEndAssessment: boolean;
  } | null> => {
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

    // Count only numbered questions (>0), ignore greeting (0 or undefined)
    const questionCount = assistantMessages.filter(
      (m) => (m.questionNumber ?? 0) > 0,
    ).length;

    // Enforce strict 5-question limit
    const shouldEndAssessment = questionCount >= 5;

    const now = Date.now();

    const messageId = (await ctx.db.insert("aiMessages", {
      conversationId,
      role: "user",
      content,
      metadataJson,
      createdAt: now,
    })) as Id<"aiMessages">;

    await ctx.db.patch(conversationId, { lastMessageAt: now, updatedAt: now });

    return { messageId, questionCount, shouldEndAssessment };
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
  ): Promise<{
    messageId: Id<"aiMessages">;
    totalQuestions: number;
  } | null> => {
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

    // Count existing assistant messages to enforce limit
    const existingQuestions = await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .filter((q) => q.eq(q.field("role"), "assistant"))
      .collect();

    // Only count messages that are numbered questions (ignore greeting/questionNumber=0)
    const counted = existingQuestions.filter(
      (m) => (m.questionNumber ?? 0) > 0,
    );
    const nextQuestionNumber =
      typeof questionNumber === "number" ? questionNumber : counted.length + 1;

    // Prevent adding more than 5 numbered questions; questionNumber=0 (greeting) is always allowed
    if (nextQuestionNumber > 5) {
      throw new Error("Maximum 5 questions allowed per assessment");
    }

    const now = Date.now();

    const messageId = (await ctx.db.insert("aiMessages", {
      conversationId,
      role: "assistant",
      content,
      metadataJson,
      // Persist explicit questionNumber when provided (e.g., greeting=0); otherwise use computed
      questionNumber: nextQuestionNumber,
      createdAt: now,
    })) as Id<"aiMessages">;

    await ctx.db.patch(conversationId, { lastMessageAt: now, updatedAt: now });

    return { messageId, totalQuestions: nextQuestionNumber };
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
      readonly questionNumber?: number;
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
      questionNumber: m.questionNumber ?? undefined,
      createdAt: m.createdAt,
    }));
  },
});
