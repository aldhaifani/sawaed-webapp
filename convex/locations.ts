import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const AppLocale = v.union(v.literal("ar"), v.literal("en"));

const choose = (
  locale: "ar" | "en",
  ar?: string | null,
  en?: string | null,
): string => {
  const a = (ar ?? "").trim();
  const e = (en ?? "").trim();
  return locale === "ar" ? a || e : e || a;
};

export const listRegions = query({
  args: { locale: AppLocale },
  handler: async (ctx, { locale }) => {
    const regions = await ctx.db.query("regions").collect();
    return regions.map((r) => ({
      id: r._id as Id<"regions">,
      name: choose(locale, (r as any).nameAr, (r as any).nameEn),
    }));
  },
});

export const listCitiesByRegion = query({
  args: { regionId: v.optional(v.id("regions")), locale: AppLocale },
  handler: async (ctx, { regionId, locale }) => {
    if (!regionId) return [] as { id: Id<"cities">; name: string }[];
    const cities = await ctx.db
      .query("cities")
      .withIndex("by_region", (q) => q.eq("regionId", regionId))
      .collect();
    return cities.map((c) => ({
      id: c._id as Id<"cities">,
      name: choose(locale, (c as any).nameAr, (c as any).nameEn),
    }));
  },
});

export const getLocationDisplay = query({
  args: {
    cityId: v.optional(v.id("cities")),
    regionId: v.optional(v.id("regions")),
    locale: AppLocale,
  },
  handler: async (ctx, { cityId, regionId, locale }) => {
    const [region, city] = await Promise.all([
      regionId ? ctx.db.get(regionId) : Promise.resolve(null),
      cityId ? ctx.db.get(cityId) : Promise.resolve(null),
    ]);
    const regionName = region
      ? choose(locale, (region as any).nameAr, (region as any).nameEn)
      : undefined;
    const cityName = city
      ? choose(locale, (city as any).nameAr, (city as any).nameEn)
      : undefined;
    return { region: regionName, city: cityName } as const;
  },
});
