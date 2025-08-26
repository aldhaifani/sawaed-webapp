import { query } from "./_generated/server";
import { v } from "convex/values";

// Helper function to get date ranges
const getDateRange = (days: number) => {
  const now = Date.now();
  const start = now - days * 24 * 60 * 60 * 1000;
  return { start, end: now };
};

// Admin dashboard KPI metrics
export const getAdminKPIs = query({
  args: {},
  handler: async (ctx) => {
    // Total published opportunities
    const totalOpportunities = await ctx.db
      .query("events")
      .withIndex("by_published_start", (q) => q.eq("isPublished", true))
      .collect();

    // Open opportunities (with active registration dates)
    const now = Date.now();
    const openOpportunities = totalOpportunities.filter((event) => {
      const regOpen = event.registrationsOpenDate || event.startingDate;
      const regClose = event.registrationsCloseDate || event.endingDate;
      return regOpen <= now && regClose >= now;
    });

    // Upcoming opportunities: registration has not opened yet
    // Use registrationsOpenDate when present, otherwise startingDate
    const upcomingOpportunities = totalOpportunities.filter((event) => {
      const regOpen = event.registrationsOpenDate || event.startingDate;
      return regOpen > now;
    });

    // Weekly registrations - need to filter by timestamp manually since no timestamp index
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const allRegistrations = await ctx.db.query("eventRegistrations").collect();
    const weeklyRegistrations = allRegistrations.filter(
      (reg) => reg.timestamp >= weekAgo,
    );

    return {
      totalOpportunities: totalOpportunities.length,
      openOpportunities: openOpportunities.length,
      upcomingOpportunities: upcomingOpportunities.length,
      weeklyRegistrations: weeklyRegistrations.length,
    };
  },
});

// Monthly opportunities data for bar chart
export const getMonthlyOpportunities = query({
  args: {
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const months = args.months || 12;
    const now = new Date();
    const data = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = date.getTime();
      const endOfMonth = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
      ).getTime();

      const count = await ctx.db
        .query("events")
        .withIndex("by_published_start", (q) =>
          q
            .eq("isPublished", true)
            .gte("startingDate", startOfMonth)
            .lt("startingDate", endOfMonth),
        )
        .collect();

      data.push({
        month: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        count: count.length,
      });
    }

    return data;
  },
});

// Top opportunity categories
export const getTopCategories = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 6;

    // Get all published events
    const events = await ctx.db
      .query("events")
      .withIndex("by_published_start", (q) => q.eq("isPublished", true))
      .collect();

    // Count by category (we'll use a simple categorization based on title keywords)
    const categoryMap = new Map<string, number>();

    events.forEach((event) => {
      // Simple categorization based on keywords in title/description
      const text =
        `${event.titleEn} ${event.titleAr} ${event.descriptionEn} ${event.descriptionAr}`.toLowerCase();

      let category = "General";

      if (text.includes("workshop") || text.includes("ورشة")) {
        category = "Workshops";
      } else if (
        text.includes("competition") ||
        text.includes("challenge") ||
        text.includes("مسابقة")
      ) {
        category = "Competitions";
      } else if (text.includes("volunteer") || text.includes("تطوع")) {
        category = "Volunteering";
      } else if (text.includes("hackathon") || text.includes("هاكاثون")) {
        category = "Hackathons";
      } else if (text.includes("training") || text.includes("تدريب")) {
        category = "Training";
      } else if (text.includes("conference") || text.includes("مؤتمر")) {
        category = "Conferences";
      }

      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    // Convert to array and sort by count
    const categories = Array.from(categoryMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

    return categories;
  },
});

// Recent youth activity
export const getRecentYouthActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 3;

    // Get recent registrations with user and event details
    // Filter by status manually since we need to sort by timestamp
    const allRegistrations = await ctx.db.query("eventRegistrations").collect();
    const recentRegistrations = allRegistrations
      // Show latest meaningful activity; exclude rejected
      .filter((reg) => reg.status !== "rejected")
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    const activities = await Promise.all(
      recentRegistrations.map(async (reg) => {
        const [user, event] = await Promise.all([
          ctx.db.get(reg.userId),
          ctx.db.get(reg.eventId),
        ]);

        if (!user || !event) return null;

        const nameEn =
          `${user?.firstNameEn || ""} ${user?.lastNameEn || ""}`.trim();
        const nameAr =
          `${user?.firstNameAr || ""} ${user?.lastNameAr || ""}`.trim();
        const displayName = `${nameEn || nameAr}`.trim();

        const eventTitleEn = event.titleEn || "";
        const eventTitleAr = event.titleAr || "";
        const eventTitle = eventTitleEn || eventTitleAr || "";

        // Map registration statuses to a concise action for UI
        const action = reg.status === "accepted" ? "Registered" : "Applied";

        return {
          id: reg._id,
          name: displayName,
          nameEn,
          nameAr,
          action,
          details: eventTitle,
          eventTitleEn,
          eventTitleAr,
          timestamp: reg.timestamp,
        };
      }),
    );

    return activities.filter(Boolean);
  },
});

// Daily registration trends for the last 30 days
export const getRegistrationTrends = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const now = Date.now();
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      ).getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

      // Filter by timestamp manually since no timestamp index
      const allRegistrations = await ctx.db
        .query("eventRegistrations")
        .collect();
      const count = allRegistrations.filter(
        (reg) => reg.timestamp >= startOfDay && reg.timestamp < endOfDay,
      );

      data.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        registrations: count.length,
      });
    }

    return data;
  },
});
