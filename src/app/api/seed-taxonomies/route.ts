import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/../convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import skills from "../../../../data/taxonomies/skills.json" assert { type: "json" };
import interests from "../../../../data/taxonomies/interests.json" assert { type: "json" };

export async function POST(): Promise<Response> {
  try {
    const skillsPayload = (
      skills as Array<{ nameEn: string; nameAr: string; category?: string }>
    ).map((s) => ({
      nameEn: s.nameEn,
      nameAr: s.nameAr,
      category: s.category,
    }));
    const interestsPayload = (
      interests as Array<{ nameEn: string; nameAr: string; category?: string }>
    ).map((i) => ({
      nameEn: i.nameEn,
      nameAr: i.nameAr,
      category: i.category,
    }));

    // Forward the authenticated Convex token so RBAC (SUPER_ADMIN) is enforced server-side
    const token = await convexAuthNextjsToken();
    const [skillsResult, interestsResult] = await Promise.all([
      fetchMutation(api.seed.upsertSkills, { items: skillsPayload }, { token }),
      fetchMutation(
        api.seed.upsertInterests,
        { items: interestsPayload },
        { token },
      ),
    ]);

    return NextResponse.json({
      skills: skillsResult,
      interests: interestsResult,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message ?? "Seeding failed" },
      { status: 500 },
    );
  }
}
