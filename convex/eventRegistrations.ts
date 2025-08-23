import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireRole, requireUser } from "./authz";
import { ROLES } from "@/shared/rbac";

// Types consistent with schema
export type RegistrationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "waitlisted";

export const getMyRegistrationForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", eventId).eq("userId", user._id),
      )
      .unique();
    return existing ?? null;
  },
});

export const applyToEvent = mutation({
  args: {
    eventId: v.id("events"),
    quantity: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { eventId, quantity, notes }) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const ev = await ctx.db.get(eventId);
    if (!ev || !ev.isPublished) throw new Error("EVENT_NOT_AVAILABLE");

    // Registration window checks
    if (
      typeof ev.registrationsOpenDate === "number" &&
      now < ev.registrationsOpenDate
    ) {
      throw new Error("REGISTRATION_NOT_OPEN");
    }
    if (
      typeof ev.registrationsCloseDate === "number" &&
      now > ev.registrationsCloseDate
    ) {
      throw new Error("REGISTRATION_CLOSED");
    }

    // Policy check
    if (ev.registrationPolicy === "inviteOnly") throw new Error("INVITE_ONLY");

    // Prevent duplicate active registrations
    const existing = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", eventId).eq("userId", user._id),
      )
      .unique();
    if (
      existing &&
      ["pending", "accepted", "waitlisted"].includes(existing.status)
    ) {
      throw new Error("ALREADY_REGISTERED");
    }

    // Capacity check counts only accepted registrations
    const acceptedCount = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", eventId).eq("status", "accepted"),
      )
      .collect()
      .then((r) => r.length);

    let status: RegistrationStatus = "pending";
    if (ev.registrationPolicy === "open") {
      const capacity =
        typeof ev.capacity === "number" ? ev.capacity : undefined;
      if (capacity !== undefined && acceptedCount >= capacity) {
        if (ev.allowWaitlist) status = "waitlisted";
        else throw new Error("EVENT_FULL");
      } else {
        status = "accepted";
      }
    } else {
      // approval policy
      const capacity =
        typeof ev.capacity === "number" ? ev.capacity : undefined;
      if (
        capacity !== undefined &&
        acceptedCount >= capacity &&
        ev.allowWaitlist
      ) {
        status = "waitlisted";
      } else {
        status = "pending";
      }
    }

    const id = await ctx.db.insert("eventRegistrations", {
      userId: user._id as Id<"appUsers">,
      eventId,
      timestamp: now,
      quantity,
      status,
      notes,
      decidedAt: undefined,
      decidedByAdminId: undefined,
    });

    return { id, status } as const;
  },
});

export const cancelMyRegistration = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", eventId).eq("userId", user._id),
      )
      .unique();
    if (!existing) throw new Error("NOT_REGISTERED");
    if (existing.status === "cancelled") return { ok: true } as const;
    await ctx.db.patch(existing._id, {
      status: "cancelled",
      decidedAt: Date.now(),
    });
    return { ok: true } as const;
  },
});

export const listEventRegistrationsForAdmin = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("rejected"),
        v.literal("cancelled"),
        v.literal("waitlisted"),
      ),
    ),
  },
  handler: async (ctx, { eventId, status }) => {
    await requireRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    let q = ctx.db
      .query("eventRegistrations")
      .withIndex("by_event", (ix) => ix.eq("eventId", eventId));
    const rows = await q.collect();
    const filtered = status ? rows.filter((r) => r.status === status) : rows;
    return filtered;
  },
});

/**
 * Paginated admin listing enriched with applicant names.
 * Returns a page of registrations with joined minimal user fields.
 */
export const listEventRegistrationsForAdminPaged = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("rejected"),
        v.literal("cancelled"),
        v.literal("waitlisted"),
      ),
    ),
    cursor: v.optional(v.string()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, { eventId, status, cursor, pageSize }) => {
    await requireRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    const size = pageSize && pageSize > 0 && pageSize <= 100 ? pageSize : 20;
    let q = ctx.db
      .query("eventRegistrations")
      .withIndex("by_event", (ix) => ix.eq("eventId", eventId));
    const page = await q.paginate({ cursor: cursor ?? null, numItems: size });
    const filtered = status
      ? page.page.filter((r) => r.status === status)
      : page.page;
    const enriched = await Promise.all(
      filtered.map(async (r) => {
        const user = await ctx.db.get(r.userId as Id<"appUsers">);
        return {
          registration: r,
          user: user
            ? {
                _id: user._id,
                firstNameAr: user.firstNameAr ?? null,
                lastNameAr: user.lastNameAr ?? null,
                firstNameEn: user.firstNameEn ?? null,
                lastNameEn: user.lastNameEn ?? null,
                email: user.email,
              }
            : null,
        } as const;
      }),
    );
    return {
      page: enriched,
      isDone: page.isDone,
      continueCursor: page.continueCursor ?? null,
    } as const;
  },
});

export const updateRegistrationStatus = mutation({
  args: {
    registrationId: v.id("eventRegistrations"),
    status: v.union(
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("waitlisted"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { registrationId, status, notes }) => {
    const admin = await requireRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    const reg = await ctx.db.get(registrationId);
    if (!reg) throw new Error("NOT_FOUND");
    const ev = await ctx.db.get(reg.eventId as Id<"events">);
    if (!ev) throw new Error("EVENT_NOT_FOUND");

    if (status === "accepted" && typeof ev.capacity === "number") {
      const acceptedCount = await ctx.db
        .query("eventRegistrations")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", reg.eventId).eq("status", "accepted"),
        )
        .collect()
        .then((r) => r.length);
      if (acceptedCount >= ev.capacity) {
        if (ev.allowWaitlist) status = "waitlisted";
        else throw new Error("EVENT_FULL");
      }
    }

    await ctx.db.patch(registrationId, {
      status,
      notes,
      decidedAt: Date.now(),
      decidedByAdminId: admin._id as Id<"appUsers">,
    });
    return { ok: true } as const;
  },
});
