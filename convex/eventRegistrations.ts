import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
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
    const rows = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", eventId).eq("userId", user._id),
      )
      .collect();
    if (!rows.length) return null;
    // Prefer latest by timestamp; if ties, arbitrary
    const latest = rows.reduce(
      (acc, r) =>
        !acc || (typeof r.timestamp === "number" && r.timestamp > acc.timestamp)
          ? r
          : acc,
      null as (typeof rows)[number] | null,
    );
    return latest ?? null;
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
    const existingRows = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", eventId).eq("userId", user._id),
      )
      .collect();
    const latest = existingRows.reduce(
      (acc, r) =>
        !acc || (typeof r.timestamp === "number" && r.timestamp > acc.timestamp)
          ? r
          : acc,
      null as (typeof existingRows)[number] | null,
    );
    if (latest) {
      if (["pending", "accepted", "waitlisted"].includes(latest.status)) {
        throw new Error("ALREADY_REGISTERED");
      }
      if (latest.status === "rejected") {
        throw new Error("REJECTED_CANNOT_REAPPLY");
      }
    }

    // Resolve quantity (default to 1) and validate
    const qty =
      typeof quantity === "number" && !Number.isNaN(quantity) ? quantity : 1;
    if (qty < 1) throw new Error("INVALID_QUANTITY");

    // Enforce max registrations per user (interpreted as max seats per user)
    if (typeof ev.maxRegistrationsPerUser === "number") {
      if (qty > ev.maxRegistrationsPerUser) {
        throw new Error("MAX_PER_USER_EXCEEDED");
      }
    }

    // Capacity check sums quantities of accepted registrations
    const acceptedSum = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", eventId).eq("status", "accepted"),
      )
      .collect()
      .then((rows) =>
        rows.reduce(
          (acc, r) => acc + (typeof r.quantity === "number" ? r.quantity : 1),
          0,
        ),
      );

    let status: RegistrationStatus = "pending";
    if (ev.registrationPolicy === "open") {
      const capacity =
        typeof ev.capacity === "number" ? ev.capacity : undefined;
      if (capacity !== undefined) {
        const remaining = capacity - acceptedSum;
        if (remaining <= 0) {
          if (ev.allowWaitlist) status = "waitlisted";
          else throw new Error("EVENT_FULL");
        } else if (qty > remaining) {
          // Not enough seats for immediate acceptance
          if (ev.allowWaitlist) status = "waitlisted";
          else throw new Error("EVENT_FULL");
        } else {
          status = "accepted";
        }
      } else {
        // No capacity specified => accept directly
        status = "accepted";
      }
    } else {
      // approval policy
      const capacity =
        typeof ev.capacity === "number" ? ev.capacity : undefined;
      if (
        capacity !== undefined &&
        acceptedSum >= capacity &&
        ev.allowWaitlist
      ) {
        status = "waitlisted";
      } else {
        status = "pending";
      }
    }

    // If there is a previous cancelled, upsert by patching it
    if (latest && latest.status === "cancelled") {
      await ctx.db.patch(latest._id, {
        timestamp: now,
        quantity: qty,
        status,
        notes,
        decidedAt: undefined,
        decidedByAdminId: undefined,
      });
      return { id: latest._id, status } as const;
    }

    // Otherwise, insert a new registration
    const id = await ctx.db.insert("eventRegistrations", {
      userId: user._id as Id<"appUsers">,
      eventId,
      timestamp: now,
      quantity: qty,
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
    // Optional server-side filters
    searchText: v.optional(v.string()),
    dateFrom: v.optional(v.number()), // inclusive ms epoch
    dateTo: v.optional(v.number()), // inclusive ms epoch
    cursor: v.optional(v.string()),
    pageSize: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { eventId, status, searchText, dateFrom, dateTo, cursor, pageSize },
  ) => {
    await requireRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    const size = pageSize && pageSize > 0 && pageSize <= 100 ? pageSize : 20;
    // Fetch all registrations for event, then filter server-side before paginating
    const allForEvent = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event", (ix) => ix.eq("eventId", eventId))
      .collect();

    // Apply status and date range filters
    const afterStatusDate = allForEvent.filter((r) => {
      if (status && r.status !== status) return false;
      if (typeof dateFrom === "number" && r.timestamp < dateFrom) return false;
      if (typeof dateTo === "number" && r.timestamp > dateTo) return false;
      return true;
    });

    // Enrich with user minimal fields to support search and display
    const enrichedAll = await Promise.all(
      afterStatusDate.map(async (r) => {
        const user = await ctx.db.get(r.userId as Id<"appUsers">);
        const enriched = {
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
        return enriched;
      }),
    );

    // Apply searchText on user fields (first/last names in both langs, email)
    const normalizedSearch = (searchText ?? "").trim().toLowerCase();
    const filteredEnriched = normalizedSearch
      ? enrichedAll.filter((e) => {
          const u = e.user;
          if (!u) return false;
          const parts = [
            u.firstNameAr ?? "",
            u.lastNameAr ?? "",
            u.firstNameEn ?? "",
            u.lastNameEn ?? "",
            u.email ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return parts.includes(normalizedSearch);
        })
      : enrichedAll;

    // Cursor-based pagination over filtered array using numeric string index
    const decodeCursor = (c: string | null | undefined): number => {
      if (!c) return 0;
      const n = Number(c);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    const start = decodeCursor(cursor);
    const end = start + size;
    const page = filteredEnriched.slice(start, end);
    const nextCursor = end < filteredEnriched.length ? String(end) : null;

    return {
      page,
      isDone: nextCursor === null,
      continueCursor: nextCursor,
    } as const;
  },
});

/**
 * Aggregate counts of registrations per status and accepted seats sum.
 */
export const getEventRegistrationCounts = query({
  args: {
    eventId: v.id("events"),
    // Optional same filters as list to match UI state
    searchText: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
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
  handler: async (ctx, { eventId, status, searchText, dateFrom, dateTo }) => {
    await requireRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    const regs = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event", (ix) => ix.eq("eventId", eventId))
      .collect();
    // Filter by status/date
    const filtered = regs.filter((r) => {
      if (status && r.status !== status) return false;
      if (typeof dateFrom === "number" && r.timestamp < dateFrom) return false;
      if (typeof dateTo === "number" && r.timestamp > dateTo) return false;
      return true;
    });

    // If searchText present, need to fetch users for matching
    let afterSearch = filtered;
    const s = (searchText ?? "").trim().toLowerCase();
    if (s) {
      const enriched = await Promise.all(
        filtered.map(async (r) => {
          const u = await ctx.db.get(r.userId as Id<"appUsers">);
          return { r, u } as const;
        }),
      );
      afterSearch = enriched
        .filter(({ u }) => {
          if (!u) return false;
          const hay = [
            u.firstNameAr ?? "",
            u.lastNameAr ?? "",
            u.firstNameEn ?? "",
            u.lastNameEn ?? "",
            u.email ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(s);
        })
        .map(({ r }) => r);
    }

    const counts = {
      total: afterSearch.length,
      pending: 0,
      accepted: 0,
      rejected: 0,
      cancelled: 0,
      waitlisted: 0,
      acceptedSeats: 0,
    } as const;
    // Use mutable temp to compute then spread into return const
    const acc = { ...counts } as any;
    for (const r of afterSearch) {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      if (r.status === "accepted") {
        acc.acceptedSeats += typeof r.quantity === "number" ? r.quantity : 1;
      }
    }
    return acc as typeof counts;
  },
});

/**
 * Export filtered registrations to CSV and return a temporary download URL.
 */
export const exportEventRegistrationsCsv = action({
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
    searchText: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, { eventId, status, searchText, dateFrom, dateTo }) => {
    // Enforce RBAC by calling a query that already checks roles, or add a lightweight role check via a query
    // We'll call the paged query to stream all rows with filters applied server-side.
    const pageSize = 500;
    let cursor: string | null = null;
    const all: Array<{
      registration: any;
      user: {
        _id: string;
        firstNameAr: string | null;
        lastNameAr: string | null;
        firstNameEn: string | null;
        lastNameEn: string | null;
        email: string;
      } | null;
    }> = [];
    do {
      const res: { page: any[]; continueCursor: string | null } =
        await ctx.runQuery(
          api.eventRegistrations.listEventRegistrationsForAdminPaged,
          {
            eventId,
            status,
            searchText,
            dateFrom,
            dateTo,
            cursor: cursor ?? undefined,
            pageSize,
          },
        );
      all.push(...(res.page as any[]));
      cursor = res.continueCursor;
    } while (cursor);

    const header = [
      "registration_id",
      "user_id",
      "first_name_ar",
      "last_name_ar",
      "first_name_en",
      "last_name_en",
      "email",
      "timestamp",
      "status",
      "quantity",
      "notes",
    ];
    const lines = [header.join(",")];
    // CSV escaping helper: wrap in double quotes and escape existing quotes
    const esc = (val: unknown): string => {
      const s = String(val ?? "");
      // Escape double quotes by doubling them per RFC 4180
      const escaped = s.replace(/"/g, '""');
      return `"${escaped}"`;
    };
    for (const entry of all) {
      const r = entry.registration as any;
      const u = entry.user as any;
      const values = [
        esc((r as any)._id),
        esc((r as any).userId),
        esc(u?.firstNameAr),
        esc(u?.lastNameAr),
        esc(u?.firstNameEn),
        esc(u?.lastNameEn),
        esc(u?.email),
        esc(r.timestamp),
        esc(r.status),
        esc(typeof r.quantity === "number" ? r.quantity : 1),
        esc(r.notes ?? ""),
      ];
      lines.push(values.join(","));
    }
    const csv = lines.join("\n");
    // Prepend UTF-8 BOM to ensure Excel and other tools detect UTF-8 (Arabic)
    const bom = "\uFEFF";
    const blob = new Blob([bom, csv], { type: "text/csv;charset=utf-8" });
    const storageId = await ctx.storage.store(blob);
    const url = await ctx.storage.getUrl(storageId);
    return { url, storageId } as const;
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
