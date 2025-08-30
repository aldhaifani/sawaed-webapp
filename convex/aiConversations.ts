import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { auth } from "./auth";

/**
 * Conversations API (MVP)
 * - One or more conversations per user+skill. We reuse the latest active when available.
 * - Language is pinned at creation based on user preference or caller input.
 */
export const createOrGetActive = mutation({
  args: {
    aiSkillId: v.id("aiSkills"),
    language: v.union(v.literal("ar"), v.literal("en")),
    systemPrompt: v.optional(v.string()),
    // If true, always create a new conversation even if an active one exists
    forceNew: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { aiSkillId, language, systemPrompt, forceNew },
  ): Promise<{ conversationId: Id<"aiConversations"> } | null> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;

    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser) return null;

    const now = Date.now();

    if (!forceNew) {
      const existingActive = await ctx.db
        .query("aiConversations")
        .withIndex("by_user_skill_status", (q) =>
          q
            .eq("userId", appUser._id as Id<"appUsers">)
            .eq("aiSkillId", aiSkillId)
            .eq("status", "active"),
        )
        .order("desc")
        .first();
      if (existingActive) {
        // Refresh lastMessageAt for ordering
        await ctx.db.patch(existingActive._id as Id<"aiConversations">, {
          lastMessageAt: now,
          updatedAt: now,
        });
        return { conversationId: existingActive._id as Id<"aiConversations"> };
      }
    }

    const conversationId = (await ctx.db.insert("aiConversations", {
      userId: appUser._id as Id<"appUsers">,
      aiSkillId,
      status: "active",
      language,
      systemPrompt,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    })) as Id<"aiConversations">;

    return { conversationId };
  },
});

export const closeConversation = mutation({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, { conversationId }): Promise<{ ok: true } | null> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;

    const existing = await ctx.db.get(conversationId);
    if (!existing) return null;

    // Ownership check: ensure the authed user owns this conversation
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || existing.userId !== (appUser._id as Id<"appUsers">)) {
      return null;
    }

    await ctx.db.patch(conversationId, {
      status: "closed",
      updatedAt: Date.now(),
    });
    return { ok: true } as const;
  },
});

export const listByUser = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<
    ReadonlyArray<{
      readonly _id: Id<"aiConversations">;
      readonly userId: Id<"appUsers">;
      readonly aiSkillId: Id<"aiSkills">;
      readonly status: "active" | "closed" | "archived";
      readonly language: "ar" | "en";
      readonly systemPrompt?: string;
      readonly lastMessageAt: number;
      readonly createdAt: number;
      readonly updatedAt: number;
    }>
  > => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return [];

    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser) return [];

    const convos = await ctx.db
      .query("aiConversations")
      .withIndex("by_user_last_message", (q) =>
        q.eq("userId", appUser._id as Id<"appUsers">),
      )
      .order("desc")
      .collect();

    return convos.map((c) => ({
      _id: c._id as Id<"aiConversations">,
      userId: c.userId as Id<"appUsers">,
      aiSkillId: c.aiSkillId as Id<"aiSkills">,
      status: c.status,
      language: c.language,
      systemPrompt: c.systemPrompt ?? undefined,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  },
});
