/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ResendOTP from "../ResendOTP.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as authz from "../authz.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as localization from "../localization.js";
import type * as onboarding from "../onboarding.js";
import type * as posthog from "../posthog.js";
import type * as preferences from "../preferences.js";
import type * as rbac from "../rbac.js";
import type * as rbacHelpers from "../rbacHelpers.js";
import type * as rbacWrappers from "../rbacWrappers.js";
import type * as seed from "../seed.js";
import type * as taxonomies from "../taxonomies.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  analytics: typeof analytics;
  auth: typeof auth;
  authz: typeof authz;
  crons: typeof crons;
  http: typeof http;
  localization: typeof localization;
  onboarding: typeof onboarding;
  posthog: typeof posthog;
  preferences: typeof preferences;
  rbac: typeof rbac;
  rbacHelpers: typeof rbacHelpers;
  rbacWrappers: typeof rbacWrappers;
  seed: typeof seed;
  taxonomies: typeof taxonomies;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
