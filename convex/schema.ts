import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  // Application-specific users table linked to Convex Auth `users`.
  // We name it `appUsers` to avoid clashing with Convex Auth's `users`.
  appUsers: defineTable({
    authUserId: v.id("users"),
    email: v.string(),
    userName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    firstNameAr: v.optional(v.string()),
    lastNameAr: v.optional(v.string()),
    firstNameEn: v.optional(v.string()),
    lastNameEn: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    phone: v.optional(v.string()),
    role: v.union(
      v.literal("YOUTH"),
      v.literal("ADMIN"),
      v.literal("SUPER_ADMIN"),
    ),
    isBlocked: v.boolean(),
    isDeleted: v.boolean(),
    languagePreference: v.union(v.literal("ar"), v.literal("en")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_user", ["authUserId"]) // for quick lookups by auth user id
    .index("by_email", ["email"]) // enforce uniqueness at write-time in code
    .index("by_role", ["role"]) // admin lists by role
    .index("by_is_deleted", ["isDeleted"]) // audit deleted users
    .index("by_is_blocked", ["isBlocked"]) // audit blocked users
    .index("by_created_at", ["createdAt"]), // sort users by creation time

  // User Profile linked to `appUsers`
  profiles: defineTable({
    userId: v.id("appUsers"),
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    // Location via taxonomy references
    regionId: v.optional(v.id("regions")),
    cityId: v.optional(v.id("cities")),
    pictureUrl: v.optional(v.string()),
    pictureStorageId: v.optional(v.id("_storage")),
    completionPercentage: v.optional(v.number()), // 0-100, validate range in code
    collaborationStatus: v.optional(
      v.union(v.literal("open"), v.literal("closed"), v.literal("looking")),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]), // fetch a user's profile
  // Master taxonomy: Skills (bilingual)
  skills: defineTable({
    nameEn: v.string(),
    nameAr: v.string(),
    category: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name_en", ["nameEn"])
    .index("by_category", ["category"]),

  // Master taxonomy: Interests (bilingual)
  interests: defineTable({
    nameEn: v.string(),
    nameAr: v.string(),
    category: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name_en", ["nameEn"])
    .index("by_category", ["category"]),

  // Master taxonomy: Regions (bilingual)
  regions: defineTable({
    nameEn: v.string(),
    nameAr: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name_en", ["nameEn"]),

  // Master taxonomy: Cities (bilingual), linked to a Region
  cities: defineTable({
    nameEn: v.string(),
    nameAr: v.string(),
    regionId: v.id("regions"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name_en", ["nameEn"]) // search by English name
    .index("by_region", ["regionId"]), // list by region

  // Junction table: User ↔ Skill
  userSkills: defineTable({
    userId: v.id("appUsers"),
    skillId: v.id("skills"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]) // fetch a user's skills
    .index("by_skill", ["skillId"]) // reverse lookup
    .index("by_user_skill", ["userId", "skillId"]) // aid uniqueness checks in code
    .index("by_user_created", ["userId", "createdAt"]), // list in insertion order

  // Junction table: User ↔ Interest
  userInterests: defineTable({
    userId: v.id("appUsers"),
    interestId: v.id("interests"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]) // fetch a user's interests
    .index("by_interest", ["interestId"]) // reverse lookup
    .index("by_user_interest", ["userId", "interestId"]) // aid uniqueness checks in code
    .index("by_user_created", ["userId", "createdAt"]), // list in insertion order

  // Education entries per user
  education: defineTable({
    userId: v.id("appUsers"),
    institution: v.string(),
    degree: v.string(),
    field: v.optional(v.string()),
    startYear: v.optional(v.number()),
    endYear: v.optional(v.union(v.number(), v.literal("Present"))),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) // fetch a user's education
    .index("by_user_created", ["userId", "createdAt"]), // ordered listing

  // Work & volunteering experiences per user
  experiences: defineTable({
    userId: v.id("appUsers"),
    title: v.string(),
    organization: v.string(),
    startDate: v.optional(v.number()), // ms epoch
    endDate: v.optional(v.number()), // ms epoch
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) // fetch a user's experiences
    .index("by_user_created", ["userId", "createdAt"]),

  // Projects per user
  projects: defineTable({
    userId: v.id("appUsers"),
    title: v.string(),
    period: v.optional(v.string()),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) // fetch a user's projects
    .index("by_user_created", ["userId", "createdAt"]),

  // Awards & certifications per user
  awards: defineTable({
    userId: v.id("appUsers"),
    title: v.string(),
    issuer: v.optional(v.string()),
    year: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) // fetch a user's awards
    .index("by_user_created", ["userId", "createdAt"]),

  // Track onboarding progress/state per user
  userOnboarding: defineTable({
    userId: v.id("appUsers"),
    currentStep: v.optional(v.string()), // e.g., "language", "profile", "skills", "interests"
    completed: v.boolean(),
    // Draft fields persisted during onboarding
    firstNameAr: v.optional(v.string()),
    lastNameAr: v.optional(v.string()),
    firstNameEn: v.optional(v.string()),
    lastNameEn: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    // New draft taxonomy references (Option B)
    regionId: v.optional(v.id("regions")),
    cityId: v.optional(v.id("cities")),
    draftSkillIds: v.optional(v.array(v.id("skills"))),
    draftInterestIds: v.optional(v.array(v.id("interests"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) // fetch onboarding by user
    .index("by_completed", ["completed"]), // list users by completion state

  // Events posted by admins (bilingual content)
  events: defineTable({
    titleEn: v.string(),
    titleAr: v.string(),
    descriptionEn: v.string(),
    descriptionAr: v.string(),
    // Scheduling
    startingDate: v.number(), // ms
    endingDate: v.number(), // ms
    registrationsOpenDate: v.optional(v.number()), // ms
    registrationsCloseDate: v.optional(v.number()), // ms
    // Location
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    googleMapUrl: v.optional(v.string()),
    onlineUrl: v.optional(v.string()),
    posterUrl: v.optional(v.string()),
    // Publishing & registration
    isPublished: v.boolean(),
    registrationPolicy: v.union(
      v.literal("open"),
      v.literal("approval"),
      v.literal("inviteOnly"),
    ),
    isRegistrationRequired: v.boolean(),
    allowWaitlist: v.boolean(),
    capacity: v.optional(v.number()),
    externalRegistrationUrl: v.optional(v.string()),
    maxRegistrationsPerUser: v.optional(v.number()),
    termsUrl: v.optional(v.string()),
    contact: v.optional(v.string()),
    // Ownership & audit
    createdByAdminId: v.id("appUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_starting_date", ["startingDate"]) // list upcoming/past events
    .index("by_creator", ["createdByAdminId"])
    .index("by_region_city", ["region", "city"]) // location filter
    .index("by_published_start", ["isPublished", "startingDate"]) // published events by time
    .index("by_region_city_start", ["region", "city", "startingDate"]), // location + time

  // Event registrations (User ↔ Event)
  eventRegistrations: defineTable({
    userId: v.id("appUsers"),
    eventId: v.id("events"),
    timestamp: v.number(), // registration time (ms)
    quantity: v.optional(v.number()), // number of seats
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("cancelled"),
      v.literal("waitlisted"),
    ),
    notes: v.optional(v.string()),
    decidedAt: v.optional(v.number()), // ms
    decidedByAdminId: v.optional(v.id("appUsers")),
  })
    .index("by_user", ["userId"]) // user registration history
    .index("by_event", ["eventId"]) // attendees list
    .index("by_event_user", ["eventId", "userId"]) // aid duplicate prevention in code
    .index("by_event_status", ["eventId", "status"]) // filter attendees by status
    .index("by_user_status", ["userId", "status"]), // list user's registrations by status

  // Per-user notification preferences
  notificationPreferences: defineTable({
    userId: v.id("appUsers"),
    productUpdates: v.boolean(),
    securityAlerts: v.boolean(),
    marketing: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});

export default schema;
