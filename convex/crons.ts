import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every 6 hours to keep appUsers in sync with Convex Auth users lifecycle
crons.interval(
  "reconcile-orphaned-app-users",
  { hours: 6 },
  internal.users.reconcileOrphanedAppUsers,
);

export default crons;
