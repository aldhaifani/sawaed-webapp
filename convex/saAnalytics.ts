import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  interestsFact,
  interestsByRegionFact,
  K_ANON,
  regionPresenceFact,
  skillsFact,
  skillsByRegionFact,
} from "./aggregates";

const toDay = (ts: number): number => {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
};

const pickLocale = (
  locale: "ar" | "en",
  ar?: string | null,
  en?: string | null,
): string => {
  const arVal = (ar ?? "").trim();
  const enVal = (en ?? "").trim();
  return locale === "ar" ? arVal || enVal : enVal || arVal;
};

export const topSkills = query({
  args: {
    locale: v.union(v.literal("ar"), v.literal("en")),
    limit: v.optional(v.number()),
    from: v.optional(v.number()), // ms
    to: v.optional(v.number()), // ms
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    regionId: v.optional(v.id("regions")),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 10, 50));
    const fromDay = args.from ? toDay(args.from) : undefined;
    const toDayVal = args.to ? toDay(args.to) : undefined;

    const skills = await ctx.db.query("skills").collect();

    const results: Array<{ id: Id<"skills">; name: string; count: number }> =
      [];

    for (const skill of skills) {
      let total = 0;
      const genders: Array<null | "male" | "female"> = args.gender
        ? [args.gender]
        : [null, "male", "female"];
      for (const g of genders) {
        // Use region-aware aggregate if regionId provided; otherwise use legacy aggregate
        if (args.regionId) {
          const lower =
            fromDay !== undefined
              ? {
                  key: [
                    skill._id as Id<"skills">,
                    g,
                    args.regionId as Id<"regions">,
                    fromDay,
                  ] as [
                    Id<"skills">,
                    null | "male" | "female",
                    Id<"regions">,
                    number,
                  ],
                  inclusive: true as const,
                }
              : undefined;
          const upper =
            toDayVal !== undefined
              ? {
                  key: [
                    skill._id as Id<"skills">,
                    g,
                    args.regionId as Id<"regions">,
                    toDayVal,
                  ] as [
                    Id<"skills">,
                    null | "male" | "female",
                    Id<"regions">,
                    number,
                  ],
                  inclusive: true as const,
                }
              : undefined;
          const regionBounds = lower || upper ? { lower, upper } : undefined;
          const c = await skillsByRegionFact.count(ctx, {
            namespace: undefined,
            bounds: regionBounds,
          });
          total += c;
        } else {
          const lower =
            fromDay !== undefined
              ? {
                  key: [skill._id as Id<"skills">, g, fromDay] as [
                    Id<"skills">,
                    null | "male" | "female",
                    number,
                  ],
                  inclusive: true as const,
                }
              : undefined;
          const upper =
            toDayVal !== undefined
              ? {
                  key: [skill._id as Id<"skills">, g, toDayVal] as [
                    Id<"skills">,
                    null | "male" | "female",
                    number,
                  ],
                  inclusive: true as const,
                }
              : undefined;
          const nonRegionBounds = lower || upper ? { lower, upper } : undefined;
          const c = await skillsFact.count(ctx, {
            namespace: undefined,
            bounds: nonRegionBounds,
          });
          total += c;
        }
      }
      if (total >= K_ANON) {
        results.push({
          id: skill._id as Id<"skills">,
          name: pickLocale(
            args.locale,
            (skill as any).nameAr,
            (skill as any).nameEn,
          ),
          count: total,
        });
      }
    }

    results.sort((a, b) => b.count - a.count);
    return results.slice(0, limit);
  },
});

export const topInterests = query({
  args: {
    locale: v.union(v.literal("ar"), v.literal("en")),
    limit: v.optional(v.number()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    regionId: v.optional(v.id("regions")),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 10, 50));
    const fromDay = args.from ? toDay(args.from) : undefined;
    const toDayVal = args.to ? toDay(args.to) : undefined;

    const interests = await ctx.db.query("interests").collect();
    const results: Array<{ id: Id<"interests">; name: string; count: number }> =
      [];

    for (const interest of interests) {
      let total = 0;
      const genders: Array<null | "male" | "female"> = args.gender
        ? [args.gender]
        : [null, "male", "female"];
      for (const g of genders) {
        if (args.regionId) {
          const lower =
            fromDay !== undefined
              ? {
                  key: [
                    interest._id as Id<"interests">,
                    g,
                    args.regionId as Id<"regions">,
                    fromDay,
                  ] as [
                    Id<"interests">,
                    null | "male" | "female",
                    Id<"regions">,
                    number,
                  ],
                  inclusive: true as const,
                }
              : undefined;
          const upper =
            toDayVal !== undefined
              ? {
                  key: [
                    interest._id as Id<"interests">,
                    g,
                    args.regionId as Id<"regions">,
                    toDayVal,
                  ] as [
                    Id<"interests">,
                    null | "male" | "female",
                    Id<"regions">,
                    number,
                  ],
                  inclusive: true as const,
                }
              : undefined;
          const regionBounds = lower || upper ? { lower, upper } : undefined;
          const c = await interestsByRegionFact.count(ctx, {
            namespace: undefined,
            bounds: regionBounds,
          });
          total += c;
        } else {
          const lower =
            fromDay !== undefined
              ? {
                  key: [interest._id as Id<"interests">, g, fromDay] as [
                    Id<"interests">,
                    null | "male" | "female",
                    number,
                  ],
                  inclusive: true as const,
                }
              : undefined;
          const upper =
            toDayVal !== undefined
              ? {
                  key: [interest._id as Id<"interests">, g, toDayVal] as [
                    Id<"interests">,
                    null | "male" | "female",
                    number,
                  ],
                  inclusive: true as const,
                }
              : undefined;
          const nonRegionBounds = lower || upper ? { lower, upper } : undefined;
          const c = await interestsFact.count(ctx, {
            namespace: undefined,
            bounds: nonRegionBounds,
          });
          total += c;
        }
      }
      if (total >= K_ANON) {
        results.push({
          id: interest._id as Id<"interests">,
          name: pickLocale(
            args.locale,
            (interest as any).nameAr,
            (interest as any).nameEn,
          ),
          count: total,
        });
      }
    }

    results.sort((a, b) => b.count - a.count);
    return results.slice(0, limit);
  },
});

export const youthDistributionByGovernorate = query({
  args: {
    locale: v.union(v.literal("ar"), v.literal("en")),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
  },
  handler: async (ctx, args) => {
    const fromDay = args.from ? toDay(args.from) : undefined;
    const toDayVal = args.to ? toDay(args.to) : undefined;
    const regions = await ctx.db.query("regions").collect();

    const results: Array<{ id: Id<"regions">; name: string; count: number }> =
      [];

    for (const region of regions) {
      let total = 0;
      const genders: Array<null | "male" | "female"> = args.gender
        ? [args.gender]
        : [null, "male", "female"];
      for (const g of genders) {
        const lower =
          fromDay !== undefined
            ? {
                key: [region._id as Id<"regions">, g, fromDay] as [
                  Id<"regions">,
                  null | "male" | "female",
                  number,
                ],
                inclusive: true as const,
              }
            : undefined;
        const upper =
          toDayVal !== undefined
            ? {
                key: [region._id as Id<"regions">, g, toDayVal] as [
                  Id<"regions">,
                  null | "male" | "female",
                  number,
                ],
                inclusive: true as const,
              }
            : undefined;
        const bounds = lower || upper ? { lower, upper } : undefined;
        const c = await regionPresenceFact.count(ctx, {
          namespace: undefined,
          bounds,
        });
        total += c;
      }
      if (total >= K_ANON) {
        results.push({
          id: region._id as Id<"regions">,
          name: pickLocale(
            args.locale,
            (region as any).nameAr,
            (region as any).nameEn,
          ),
          count: total,
        });
      }
    }

    results.sort((a, b) => b.count - a.count);
    return results;
  },
});
