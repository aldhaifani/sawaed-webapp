import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { Id } from "./_generated/dataModel";
import { DirectAggregate } from "@convex-dev/aggregate";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// Aggregates: named via convex/convex.config.ts
export const skillsFact = new DirectAggregate<{
  Key: [Id<"skills">, null | "male" | "female", number];
  Id: string;
}>(components.skillsFact);

export const interestsFact = new DirectAggregate<{
  Key: [Id<"interests">, null | "male" | "female", number];
  Id: string;
}>(components.interestsFact);

export const regionPresenceFact = new DirectAggregate<{
  Key: [Id<"regions">, null | "male" | "female", number];
  Id: string;
}>(components.regionPresenceFact);

// Region-aware skill/interest aggregates to support efficient region filters.
export const skillsByRegionFact = new DirectAggregate<{
  Key: [Id<"skills">, null | "male" | "female", Id<"regions">, number];
  Id: string;
}>(components.skillsByRegionFact);

export const interestsByRegionFact = new DirectAggregate<{
  Key: [Id<"interests">, null | "male" | "female", Id<"regions">, number];
  Id: string;
}>(components.interestsByRegionFact);

const toDay = (ts: number): number => {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
};

async function getUserGender(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"appUsers">,
): Promise<null | "male" | "female"> {
  const user = await ctx.db.get(userId);
  const g = (user as unknown as { gender?: "male" | "female" }).gender;
  return g ?? null;
}

async function getUserRegionId(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"appUsers">,
): Promise<Id<"regions"> | null> {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const regionId =
    (profile as unknown as { regionId?: Id<"regions"> | null })?.regionId ??
    null;
  return regionId;
}

export async function insertSkillSelection(
  ctx: MutationCtx,
  args: { userId: Id<"appUsers">; skillId: Id<"skills">; createdAt: number },
): Promise<void> {
  const gender = await getUserGender(ctx, args.userId);
  const day = toDay(args.createdAt);
  const id = `${args.userId}:${args.skillId}`;
  await skillsFact.insert(ctx, { key: [args.skillId, gender, day], id });
  // Region-aware insert (best-effort snapshot based on current region)
  const regionId = await getUserRegionId(ctx, args.userId);
  if (regionId) {
    await skillsByRegionFact.insert(ctx, {
      key: [args.skillId, gender, regionId, day],
      id,
    });
  }
}

export async function deleteSkillSelection(
  ctx: MutationCtx,
  args: { userId: Id<"appUsers">; skillId: Id<"skills">; createdAt: number },
): Promise<void> {
  const gender = await getUserGender(ctx, args.userId);
  const day = toDay(args.createdAt);
  const id = `${args.userId}:${args.skillId}`;
  await skillsFact.delete(ctx, { key: [args.skillId, gender, day], id });
  // Region-aware delete (uses current region; may not reflect historical region precisely)
  const regionId = await getUserRegionId(ctx, args.userId);
  if (regionId) {
    await skillsByRegionFact.delete(ctx, {
      key: [args.skillId, gender, regionId, day],
      id,
    });
  }
}

export async function insertInterestSelection(
  ctx: MutationCtx,
  args: {
    userId: Id<"appUsers">;
    interestId: Id<"interests">;
    createdAt: number;
  },
): Promise<void> {
  const gender = await getUserGender(ctx, args.userId);
  const day = toDay(args.createdAt);
  const id = `${args.userId}:${args.interestId}`;
  await interestsFact.insert(ctx, { key: [args.interestId, gender, day], id });
  const regionId = await getUserRegionId(ctx, args.userId);
  if (regionId) {
    await interestsByRegionFact.insert(ctx, {
      key: [args.interestId, gender, regionId, day],
      id,
    });
  }
}

export async function deleteInterestSelection(
  ctx: MutationCtx,
  args: {
    userId: Id<"appUsers">;
    interestId: Id<"interests">;
    createdAt: number;
  },
): Promise<void> {
  const gender = await getUserGender(ctx, args.userId);
  const day = toDay(args.createdAt);
  const id = `${args.userId}:${args.interestId}`;
  await interestsFact.delete(ctx, { key: [args.interestId, gender, day], id });
  const regionId = await getUserRegionId(ctx, args.userId);
  if (regionId) {
    await interestsByRegionFact.delete(ctx, {
      key: [args.interestId, gender, regionId, day],
      id,
    });
  }
}

// Region presence snapshot: maintain one record per user (id = userId)
export async function upsertRegionPresenceSnapshot(
  ctx: MutationCtx,
  userId: Id<"appUsers">,
): Promise<void> {
  const gender = await getUserGender(ctx, userId);
  const regionId = await getUserRegionId(ctx, userId);
  if (!regionId) return; // nothing to record
  const day = toDay(Date.now());
  const id = `${userId}`;
  // We can't "replace" without old key. As an approximation, write the current snapshot.
  // This may leave stale entries if region/gender changed on a different day; acceptable for MVP.
  await regionPresenceFact.insert(ctx, { key: [regionId, gender, day], id });
}

export const K_ANON = 5 as const;
