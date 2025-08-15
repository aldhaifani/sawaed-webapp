import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  // Application-specific users table linked to Convex Auth `users`.
  // We name it `appUsers` to avoid clashing with Convex Auth's `users`.
  appUsers: defineTable({
    authUserId: v.id("users"),
    email: v.string(),
    userName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.union(
      v.literal("YOUTH"),
      v.literal("ADMIN"),
      v.literal("SUPER_ADMIN"),
    ),
    isBlocked: v.boolean(),
    isDeleted: v.boolean(),
    languagePreference: v.union(v.literal("ar"), v.literal("en")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_user", ["authUserId"]) // for quick lookups by auth user id
    .index("by_email", ["email"]), // enforce uniqueness at write-time in code
});

export default schema;
