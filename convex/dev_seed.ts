import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import aiSkillsData from "@/../data/learning_path/ai_skills.json";

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
 * Bulk seed AI skills from JSON file located at `convex/data/ai_skills.json`.
 * Skips existing entries by `nameEn` using index `by_name_en`.
 * Run from Convex Dashboard > Functions > mutations > dev_seed.seedAiSkillsFromJson
 */
export const seedAiSkillsFromJson = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number; skipped: number }> => {
    const now = Date.now();
    let inserted = 0;
    let skipped = 0;

    for (const item of aiSkillsData) {
      const exists = await ctx.db
        .query("aiSkills")
        .withIndex("by_name_en", (q) => q.eq("nameEn", item.nameEn))
        .first();
      if (exists) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("aiSkills", {
        nameEn: item.nameEn,
        nameAr: item.nameAr,
        category: item.category,
        definitionEn: item.definitionEn,
        definitionAr: item.definitionAr,
        levels: item.levels,
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
    }

    return { inserted, skipped };
  },
});
