import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { auth } from "./auth";

export const getMyChatConfig = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;

    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser) return null;

    const config = await ctx.db
      .query("aiChatConfigs")
      .withIndex("by_user", (q) =>
        q.eq("userId", appUser._id as Id<"appUsers">),
      )
      .unique();

    if (!config) {
      return {
        userId: appUser._id as Id<"appUsers">,
        preferredLanguage: appUser.languagePreference,
      } as const;
    }

    return {
      _id: config._id as Id<"aiChatConfigs">,
      userId: config.userId as Id<"appUsers">,
      aiSkillId: config.aiSkillId as Id<"aiSkills"> | undefined,
      systemPrompt: config.systemPrompt ?? undefined,
      preferredLanguage: config.preferredLanguage,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    } as const;
  },
});

export const upsertMyChatConfig = mutation({
  args: {
    aiSkillId: v.optional(v.id("aiSkills")),
    systemPrompt: v.optional(v.string()),
    preferredLanguage: v.optional(v.union(v.literal("ar"), v.literal("en"))),
  },
  handler: async (ctx, { aiSkillId, systemPrompt, preferredLanguage }) => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;

    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser) return null;

    const now = Date.now();

    const existing = await ctx.db
      .query("aiChatConfigs")
      .withIndex("by_user", (q) =>
        q.eq("userId", appUser._id as Id<"appUsers">),
      )
      .unique();

    const lang = preferredLanguage ?? appUser.languagePreference;

    if (!existing) {
      const _id = (await ctx.db.insert("aiChatConfigs", {
        userId: appUser._id as Id<"appUsers">,
        aiSkillId,
        systemPrompt,
        preferredLanguage: lang,
        createdAt: now,
        updatedAt: now,
      })) as Id<"aiChatConfigs">;
      return { _id } as const;
    }

    await ctx.db.patch(existing._id as Id<"aiChatConfigs">, {
      aiSkillId: aiSkillId ?? existing.aiSkillId,
      systemPrompt: systemPrompt ?? existing.systemPrompt,
      preferredLanguage: lang ?? existing.preferredLanguage,
      updatedAt: now,
    });

    return { _id: existing._id as Id<"aiChatConfigs"> } as const;
  },
});
