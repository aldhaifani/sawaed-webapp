import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config";

const app = defineApp();
// Register Aggregate component with distinct names for our fact tables
app.use(aggregate, { name: "skillsFact" });
app.use(aggregate, { name: "interestsFact" });
app.use(aggregate, { name: "regionPresenceFact" });
// Region-aware aggregates (do not remove legacy ones above). These enable
// efficient filtering by regionId without falling back to scans.
app.use(aggregate, { name: "skillsByRegionFact" });
app.use(aggregate, { name: "interestsByRegionFact" });
export default app;
