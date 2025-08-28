import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import aiSkillsData from "@/../data/learning_path/ai_skills.json";
import taxonomySkills from "@/../data/taxonomies/skills.json";
import taxonomyInterests from "@/../data/taxonomies/interests.json";
import { assertValidSkillLevels } from "./validators";

/**
 * One-off seeding for location taxonomies (Oman).
 * Run from Convex Dashboard > Functions > mutations > dev_seed.seedRegionsAndCities
 */
export const seedRegionsAndCities = mutation({
  args: {},
  handler: async (ctx): Promise<{ regions: number; cities: number }> => {
    const existingRegion = await ctx.db.query("regions").first();
    const existingCity = await ctx.db.query("cities").first();
    if (existingRegion || existingCity) {
      return { regions: 0, cities: 0 };
    }

    const now = Date.now();

    // Minimal, safe list to get started. Extend as needed.
    const data: Array<{
      nameEn: string;
      nameAr: string;
      cities: Array<{ nameEn: string; nameAr: string }>;
    }> = [
      {
        nameEn: "Muscat",
        nameAr: "مسقط",
        cities: [
          { nameEn: "Muscat", nameAr: "مسقط" },
          { nameEn: "Muttrah", nameAr: "مطرح" },
          { nameEn: "Bawshar", nameAr: "بوشر" },
          { nameEn: "Seeb", nameAr: "السيب" },
          { nameEn: "Al Amarat", nameAr: "العامرات" },
          { nameEn: "Qurayyat", nameAr: "قريات" },
        ],
      },
      {
        nameEn: "Dhofar",
        nameAr: "ظفار",
        cities: [
          { nameEn: "Salalah", nameAr: "صلالة" },
          { nameEn: "Taqah", nameAr: "طاقة" },
          { nameEn: "Mirbat", nameAr: "مرباط" },
          { nameEn: "Thumrait", nameAr: "ثمريت" },
          { nameEn: "Sadah", nameAr: "سدح" },
        ],
      },
      {
        nameEn: "Al Batinah North",
        nameAr: "شمال الباطنة",
        cities: [
          { nameEn: "Sohar", nameAr: "صحار" },
          { nameEn: "Shinas", nameAr: "شناص" },
          { nameEn: "Liwa", nameAr: "لوى" },
          { nameEn: "Saham", nameAr: "صحم" },
          { nameEn: "Al Khabourah", nameAr: "الخابورة" },
          { nameEn: "Suwayq", nameAr: "السويق" },
        ],
      },
      {
        nameEn: "Al Batinah South",
        nameAr: "جنوب الباطنة",
        cities: [
          { nameEn: "Rustaq", nameAr: "الرستاق" },
          { nameEn: "Awabi", nameAr: "العوابي" },
          { nameEn: "Nakhl", nameAr: "نخل" },
          { nameEn: "Wadi Al Maawil", nameAr: "وادي المعاول" },
          { nameEn: "Barka", nameAr: "بركاء" },
          { nameEn: "Al Musannah", nameAr: "المصنعة" },
        ],
      },
      {
        nameEn: "Al Dakhiliyah",
        nameAr: "الداخلية",
        cities: [
          { nameEn: "Nizwa", nameAr: "نزوى" },
          { nameEn: "Bahla", nameAr: "بهلا" },
          { nameEn: "Samail", nameAr: "سمائل" },
          { nameEn: "Izki", nameAr: "إزكي" },
          { nameEn: "Bidbid", nameAr: "بدبد" },
          { nameEn: "Adam", nameAr: "آدم" },
          { nameEn: "Al Hamra", nameAr: "الحمراء" },
          { nameEn: "Manah", nameAr: "منح" },
          { nameEn: "Jabal Akhdar", nameAr: "الجبل الأخضر" },
        ],
      },
      {
        nameEn: "Al Dhahirah",
        nameAr: "الظاهرة",
        cities: [
          { nameEn: "Ibri", nameAr: "عبري" },
          { nameEn: "Yanqul", nameAr: "ينقل" },
          { nameEn: "Dhank", nameAr: "ضنك" },
        ],
      },
      {
        nameEn: "Al Buraimi",
        nameAr: "البريمي",
        cities: [
          { nameEn: "Al Buraimi", nameAr: "البريمي" },
          { nameEn: "Mahdah", nameAr: "محضة" },
          { nameEn: "Al Sinainah", nameAr: "السنينة" },
        ],
      },
      {
        nameEn: "Musandam",
        nameAr: "مسندم",
        cities: [
          { nameEn: "Khasab", nameAr: "خصب" },
          { nameEn: "Dibba", nameAr: "دبا" },
          { nameEn: "Bukha", nameAr: "بخا" },
          { nameEn: "Madha", nameAr: "مدحاء" },
        ],
      },
      {
        nameEn: "Al Sharqiyah North",
        nameAr: "شمال الشرقية",
        cities: [
          { nameEn: "Ibra", nameAr: "إبراء" },
          { nameEn: "Al Mudhaibi", nameAr: "المضيبي" },
          { nameEn: "Bidiyah", nameAr: "بدية" },
          { nameEn: "Al Qabil", nameAr: "القابل" },
          { nameEn: "Wadi Bani Khalid", nameAr: "وادي بني خالد" },
          { nameEn: "Dema wa Thaieen", nameAr: "دماء والطائيين" },
        ],
      },
      {
        nameEn: "Al Sharqiyah South",
        nameAr: "جنوب الشرقية",
        cities: [
          { nameEn: "Sur", nameAr: "صور" },
          { nameEn: "Al Kamil Wal Wafi", nameAr: "الكامل والوافي" },
          { nameEn: "Jalan Bani Bu Hassan", nameAr: "جعلان بني بو حسن" },
          { nameEn: "Jalan Bani Bu Ali", nameAr: "جعلان بني بو علي" },
          { nameEn: "Masirah", nameAr: "مصيرة" },
        ],
      },
      {
        nameEn: "Al Wusta",
        nameAr: "الوسطى",
        cities: [
          { nameEn: "Haima", nameAr: "هيما" },
          { nameEn: "Mahout", nameAr: "محوت" },
          { nameEn: "Duqm", nameAr: "الدقم" },
          { nameEn: "Al Jazer", nameAr: "الجازر" },
        ],
      },
    ];

    let regionsInserted = 0;
    let citiesInserted = 0;

    for (const region of data) {
      const regionId = (await ctx.db.insert("regions", {
        nameEn: region.nameEn,
        nameAr: region.nameAr,
        createdAt: now,
        updatedAt: now,
      })) as Id<"regions">;
      regionsInserted += 1;
      for (const city of region.cities) {
        await ctx.db.insert("cities", {
          nameEn: city.nameEn,
          nameAr: city.nameAr,
          regionId,
          createdAt: now,
          updatedAt: now,
        });
        citiesInserted += 1;
      }
    }

    return { regions: regionsInserted, cities: citiesInserted };
  },
});

/**
 * Bulk seed AI skills from JSON file located at `data/learning_path/ai_skills.json`.
 * Performs an upsert by `nameEn` using index `by_name_en`:
 * - Insert new items
 * - Update existing items' definitions, levels, names, and category
 * Run from Convex Dashboard > Functions > mutations > dev_seed.seedAiSkillsFromJson
 */
export const seedAiSkillsFromJson = mutation({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ inserted: number; updated: number; skipped: number }> => {
    const now = Date.now();
    let inserted = 0;
    let updated = 0;
    // Back-compat with previous return shape that had `skipped`
    const skipped = 0;

    // 1) Ensure taxonomy Skills are present; build slug->id map
    const skillSlugToId = new Map<string, Id<"skills">>();
    for (const s of taxonomySkills as Array<{
      slug: string;
      nameEn: string;
      nameAr: string;
      category?: string;
    }>) {
      const existing = await ctx.db
        .query("skills")
        .withIndex("by_name_en", (q) => q.eq("nameEn", s.nameEn))
        .unique();
      if (existing) {
        // keep names in sync
        await ctx.db.patch(existing._id, {
          nameEn: s.nameEn,
          nameAr: s.nameAr,
          category: s.category,
          updatedAt: now,
        } as any);
        skillSlugToId.set(s.slug, existing._id as Id<"skills">);
      } else {
        const id = (await ctx.db.insert("skills", {
          nameEn: s.nameEn,
          nameAr: s.nameAr,
          category: s.category,
          createdAt: now,
          updatedAt: now,
        })) as Id<"skills">;
        skillSlugToId.set(s.slug, id);
      }
    }

    // 2) Ensure taxonomy Interests are present; build slug->id map
    const interestSlugToId = new Map<string, Id<"interests">>();
    for (const i of taxonomyInterests as Array<{
      slug: string;
      nameEn: string;
      nameAr: string;
      category?: string;
    }>) {
      const existing = await ctx.db
        .query("interests")
        .withIndex("by_name_en", (q) => q.eq("nameEn", i.nameEn))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          nameEn: i.nameEn,
          nameAr: i.nameAr,
          category: i.category,
          updatedAt: now,
        } as any);
        interestSlugToId.set(i.slug, existing._id as Id<"interests">);
      } else {
        const id = (await ctx.db.insert("interests", {
          nameEn: i.nameEn,
          nameAr: i.nameAr,
          category: i.category,
          createdAt: now,
          updatedAt: now,
        })) as Id<"interests">;
        interestSlugToId.set(i.slug, id);
      }
    }

    for (const item of aiSkillsData as Array<{
      nameEn: string;
      nameAr: string;
      category?: string;
      definitionEn: string;
      definitionAr: string;
      levels: unknown[];
      relatedSkillSlugs?: string[];
      relatedInterestSlugs?: string[];
    }>) {
      // Validate level structure before writing to DB
      assertValidSkillLevels(item.levels as any);

      const relatedSkillIds = (item.relatedSkillSlugs ?? [])
        .map((slug) => skillSlugToId.get(slug))
        .filter(Boolean) as Id<"skills">[];
      const relatedInterestIds = (item.relatedInterestSlugs ?? [])
        .map((slug) => interestSlugToId.get(slug))
        .filter(Boolean) as Id<"interests">[];

      const existing = await ctx.db
        .query("aiSkills")
        .withIndex("by_name_en", (q) => q.eq("nameEn", item.nameEn))
        .unique();

      if (existing) {
        // Update all editable fields while preserving `skillId` and `createdAt`
        await ctx.db.patch(existing._id, {
          nameEn: item.nameEn,
          nameAr: item.nameAr,
          category: item.category,
          definitionEn: item.definitionEn,
          definitionAr: item.definitionAr,
          levels: item.levels as any,
          relatedSkillIds: relatedSkillIds.length ? relatedSkillIds : undefined,
          relatedInterestIds: relatedInterestIds.length
            ? relatedInterestIds
            : undefined,
          updatedAt: now,
        } as any);
        updated += 1;
        continue;
      }

      await ctx.db.insert("aiSkills", {
        nameEn: item.nameEn,
        nameAr: item.nameAr,
        category: item.category,
        definitionEn: item.definitionEn,
        definitionAr: item.definitionAr,
        levels: item.levels as any,
        relatedSkillIds: relatedSkillIds.length ? relatedSkillIds : undefined,
        relatedInterestIds: relatedInterestIds.length
          ? relatedInterestIds
          : undefined,
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
    }

    return { inserted, updated, skipped };
  },
});
