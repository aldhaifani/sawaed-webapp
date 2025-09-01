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

  // Minimal Admin Profile linked to `appUsers` (private)
  adminProfiles: defineTable({
    userId: v.id("appUsers"),
    // Basic employee info (bilingual where applicable)
    organizationNameEn: v.optional(v.string()),
    organizationNameAr: v.optional(v.string()),
    departmentEn: v.optional(v.string()),
    departmentAr: v.optional(v.string()),
    jobTitleEn: v.optional(v.string()),
    jobTitleAr: v.optional(v.string()),
    // Optional internal employee identifier
    employeeId: v.optional(v.string()),
    // Private contact info
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    // Avatar
    pictureUrl: v.optional(v.string()),
    pictureStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Minimal Super Admin Profile linked to `appUsers` (private)
  superAdminProfiles: defineTable({
    userId: v.id("appUsers"),
    email: v.string(),
    department: v.optional(v.string()),
    employeeId: v.optional(v.string()),
    // Avatar
    pictureUrl: v.optional(v.string()),
    pictureStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  // Master taxonomy: Skills (bilingual)
  skills: defineTable({
    nameEn: v.string(),
    nameAr: v.string(),
    category: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name_en", ["nameEn"])
    .index("by_category", ["category"])
    .index("by_created_at", ["createdAt"]),

  // Master taxonomy: Interests (bilingual)
  interests: defineTable({
    nameEn: v.string(),
    nameAr: v.string(),
    category: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name_en", ["nameEn"])
    .index("by_category", ["category"])
    .index("by_created_at", ["createdAt"]),

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

  // Minimal Admin Onboarding state (private)
  adminOnboarding: defineTable({
    userId: v.id("appUsers"),
    currentStep: v.optional(v.string()), // e.g., "basic", "org", "contact"
    completed: v.boolean(),
    // Draft fields persisted during onboarding
    organizationNameEn: v.optional(v.string()),
    organizationNameAr: v.optional(v.string()),
    departmentEn: v.optional(v.string()),
    departmentAr: v.optional(v.string()),
    jobTitleEn: v.optional(v.string()),
    jobTitleAr: v.optional(v.string()),
    employeeId: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) // fetch admin onboarding by user
    .index("by_completed", ["completed"]),

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

  // AI-specific Skills used for learning path generation and chat assessments
  // These are separate from `skills` to avoid breaking existing features and to
  // support richer, bilingual definitions and level structures dedicated to AI.
  aiSkills: defineTable({
    // Optional mapping to the generic taxonomy skill if applicable
    skillId: v.optional(v.id("skills")),
    nameEn: v.string(),
    nameAr: v.string(),
    category: v.optional(v.string()),
    // Bilingual definitions for AI prompts and UI context
    definitionEn: v.string(),
    definitionAr: v.string(),
    // Structured levels used by the AI and UI (ordered, level >= 1)
    levels: v.array(
      v.object({
        level: v.number(),
        nameEn: v.string(),
        nameAr: v.string(),
        descriptionEn: v.string(),
        descriptionAr: v.string(),
        // Optional structured fields for future-proofing and richer UX
        questions: v.optional(v.array(v.string())),
        evaluation: v.optional(v.array(v.string())),
        progressionSteps: v.optional(v.array(v.string())),
        resources: v.optional(
          v.array(
            v.object({
              title: v.optional(v.string()),
              url: v.string(),
            }),
          ),
        ),
      }),
    ),
    // Optional links to generic taxonomy for UI tags
    relatedSkillIds: v.optional(v.array(v.id("skills"))),
    relatedInterestIds: v.optional(v.array(v.id("interests"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name_en", ["nameEn"])
    .index("by_category", ["category"])
    .index("by_created_at", ["createdAt"]),

  // AI Assessments produced at the end of a chat session
  aiAssessments: defineTable({
    userId: v.id("appUsers"),
    aiSkillId: v.id("aiSkills"),
    level: v.number(), // integer semantic; validated in code
    confidence: v.number(), // 0..1; validated in code
    reasoning: v.optional(v.string()), // internal notes, not shown to youth
    rawJson: v.optional(v.string()), // optional raw JSON returned by AI
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]) // user assessment history
    .index("by_skill", ["aiSkillId"]) // list assessments per skill
    .index("by_user_skill", ["userId", "aiSkillId"]) // fetch latest via sort
    .index("by_created", ["createdAt"]) // time-ordered queries
    .index("by_user_skill_created", ["userId", "aiSkillId", "createdAt"]), // latest per user+skill

  // AI-generated Learning Paths linked to a specific assessment
  aiLearningPaths: defineTable({
    userId: v.id("appUsers"),
    aiSkillId: v.id("aiSkills"),
    assessmentId: v.id("aiAssessments"),
    modules: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        type: v.union(
          v.literal("article"),
          v.literal("video"),
          v.literal("quiz"),
          v.literal("project"),
        ),
        // Keep duration as a short human-readable label per PRD (e.g., "6 min")
        duration: v.string(),
        // Optional richer fields
        description: v.optional(v.string()),
        objectives: v.optional(v.array(v.string())),
        outline: v.optional(v.array(v.string())),
        resourceUrl: v.optional(v.string()),
        resourceTitle: v.optional(v.string()),
        searchKeywords: v.optional(v.array(v.string())),
        levelRef: v.optional(v.number()),
        difficulty: v.optional(
          v.union(
            v.literal("beginner"),
            v.literal("intermediate"),
            v.literal("advanced"),
          ),
        ),
      }),
    ),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("archived"),
    ),
    // Basic progress tracking without adding a separate progress table yet
    completedModuleIds: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) // fetch paths for a user
    .index("by_skill", ["aiSkillId"]) // list paths per skill
    .index("by_user_skill", ["userId", "aiSkillId"]) // user-skill paths
    .index("by_assessment", ["assessmentId"]) // link back to assessment
    .index("by_user_created", ["userId", "createdAt"]) // order by time
    .index("by_user_skill_status", ["userId", "aiSkillId", "status"]) // filter active paths
    .index("by_user_skill_status_created", [
      "userId",
      "aiSkillId",
      "status",
      "createdAt",
    ]), // latest active path

  // Per-user AI chat configuration: selected skill, system prompt, and preferred chat language
  aiChatConfigs: defineTable({
    userId: v.id("appUsers"),
    // Selected AI Skill for chat/assessment context (optional; user may not have chosen yet)
    aiSkillId: v.optional(v.id("aiSkills")),
    // Main system prompt to steer the chat agent for this user
    systemPrompt: v.optional(v.string()),
    // Preferred chat language, linked to `appUsers.languagePreference`
    preferredLanguage: v.union(v.literal("ar"), v.literal("en")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) // fetch/update the user's config
    .index("by_user_skill", ["userId", "aiSkillId"]), // fast lookup by user and skill

  // Persistent AI Conversations (MVP)
  // Stores high-level chat sessions to allow resuming and history.
  aiConversations: defineTable({
    userId: v.id("appUsers"),
    aiSkillId: v.id("aiSkills"),
    // Conversation lifecycle status; MVP uses active/closed. Archived reserved for future.
    status: v.union(
      v.literal("active"),
      v.literal("closed"),
      v.literal("archived"),
    ),
    // Conversation language for UI rendering and prompting
    language: v.union(v.literal("ar"), v.literal("en")),
    // Snapshot of the system prompt used for this conversation (optional)
    systemPrompt: v.optional(v.string()),
    // For listing by recent activity
    lastMessageAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) // list conversations for a user
    .index("by_user_skill", ["userId", "aiSkillId"]) // filter by skill
    .index("by_user_skill_status", ["userId", "aiSkillId", "status"]) // active per skill
    .index("by_user_skill_created", ["userId", "aiSkillId", "createdAt"]) // newest first
    .index("by_status", ["status"]) // operational views
    .index("by_last_message", ["lastMessageAt"]) // recent conversations
    .index("by_user_last_message", ["userId", "lastMessageAt"]) // recent by user
    .index("by_user_status_last", ["userId", "status", "lastMessageAt"]), // recent active by user

  // Persistent AI Messages (MVP)
  // Stores the discrete turns of a conversation. We persist final user and assistant turns.
  aiMessages: defineTable({
    conversationId: v.id("aiConversations"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
    ),
    content: v.string(),
    // Optional JSON string to carry extra info (e.g., detected assessment, tool results)
    metadataJson: v.optional(v.string()),
    // Track question number for assessment flow (1-5)
    questionNumber: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"]) // fetch all messages for a conversation
    .index("by_conversation_created", ["conversationId", "createdAt"]) // ordered history
    .index("by_role", ["role"]) // analytics/debugging
    .index("by_created", ["createdAt"]), // global timeline (ops)
});

export default schema;
