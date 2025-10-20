import { NextResponse } from "next/server";

// Minimal OpenAPI 3.0 spec for mobile APIs. Extend as endpoints evolve.
// No runtime deps; served as JSON for Swagger UI at /api/mobile/docs

export async function GET(): Promise<Response> {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Sawaed Mobile API",
      version: "1.0.0",
      description:
        "Versioned REST facade for the iOS app. Auth via OTP token exchange; bearer token required on /api/mobile/v1/* routes. Chat endpoints are shared under /api/chat/*.",
    },
    servers: [{ url: "/" }],
    tags: [
      { name: "Auth" },
      { name: "Onboarding" },
      { name: "Profile" },
      { name: "AI" },
      { name: "Chat" },
      { name: "Events" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      "/api/mobile/auth/signout": {
        post: {
          tags: ["Auth"],
          summary: "Sign out (server-side cleanup)",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { ok: { type: "boolean" } },
                    required: ["ok"],
                  },
                },
              },
            },
          },
          security: [],
        },
      },
      schemas: {
        ErrorEnvelope: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
              },
              required: ["code", "message"],
            },
          },
          required: ["error"],
        },
        ChatSendResponse: {
          type: "object",
          properties: {
            sessionId: { type: "string" },
            conversationId: { type: "string" },
          },
          required: ["sessionId"],
        },
        ChatStatus: {
          type: "object",
          properties: {
            sessionId: { type: "string" },
            status: {
              type: "string",
              enum: ["queued", "running", "partial", "done", "error"],
            },
            text: { type: "string" },
            updatedAt: { type: "number" },
            error: { type: "string" },
          },
          required: ["sessionId", "status", "updatedAt"],
        },
        EventApplyRequest: {
          type: "object",
          properties: {
            quantity: { type: "integer", minimum: 1 },
            notes: { type: "string", maxLength: 500 },
          },
        },
        EventRegistration: {
          type: "object",
          properties: {
            id: { type: "string" },
            status: { type: "string" },
          },
          required: ["id", "status"],
        },
        LearningPath: {
          type: "object",
          properties: {
            id: { type: "string" },
            aiSkillId: { type: "string" },
            status: {
              type: "string",
              enum: ["active", "completed", "archived"],
            },
            assessmentLevel: { type: "integer" },
            completedModuleIds: { type: "array", items: { type: "string" } },
            modules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  type: {
                    type: "string",
                    enum: ["article", "video", "quiz", "project"],
                  },
                  duration: { type: "string" },
                  description: { type: "string" },
                  objectives: { type: "array", items: { type: "string" } },
                  outline: { type: "array", items: { type: "string" } },
                  resourceUrl: { type: "string" },
                  searchKeywords: { type: "array", items: { type: "string" } },
                },
                required: ["id", "title", "type"],
              },
            },
          },
          required: ["id", "aiSkillId", "status", "modules"],
        },
        AiConfig: {
          type: "object",
          properties: {
            _id: { type: "string" },
            userId: { type: "string" },
            aiSkillId: { type: "string" },
            systemPrompt: { type: "string" },
            preferredLanguage: { type: "string", enum: ["ar", "en"] },
            createdAt: { type: "number" },
            updatedAt: { type: "number" },
          },
        },
        AiConfigUpsert: {
          type: "object",
          properties: {
            aiSkillId: { type: "string" },
            systemPrompt: { type: "string" },
            preferredLanguage: { type: "string", enum: ["ar", "en"] },
          },
        },
        OnboardingStatus: {
          type: "object",
          properties: {
            completed: { type: "boolean" },
            currentStep: { type: "string", nullable: true },
          },
          required: ["completed"],
        },
        OnboardingDraft: {
          type: "object",
          additionalProperties: true,
        },
        OnboardingStepRequest: {
          type: "object",
          properties: {
            step: {
              type: "string",
              enum: ["profile", "skills", "interests", "location"],
            },
          },
          required: ["step"],
        },
        SaveDraftDetailsRequest: {
          type: "object",
          properties: {
            firstNameAr: { type: "string" },
            lastNameAr: { type: "string" },
            firstNameEn: { type: "string" },
            lastNameEn: { type: "string" },
            gender: { type: "string", enum: ["male", "female"] },
            regionId: { type: "string" },
            cityId: { type: "string" },
          },
        },
        SaveDraftTaxonomiesRequest: {
          type: "object",
          properties: {
            skillIds: { type: "array", items: { type: "string" } },
            interestIds: { type: "array", items: { type: "string" } },
          },
        },
        ProfileComposite: {
          type: "object",
          additionalProperties: true,
        },
        ProfileBasicsUpdate: {
          type: "object",
          properties: {
            headline: { type: "string" },
            bio: { type: "string" },
            regionId: { type: "string" },
            cityId: { type: "string" },
            pictureUrl: { type: "string" },
            collaborationStatus: {
              type: "string",
              enum: ["open", "closed", "looking"],
            },
          },
        },
        ProfilePhoneUpdate: {
          type: "object",
          properties: { phone: { type: "string" } },
          required: ["phone"],
        },
        ProfileGenderUpdate: {
          type: "object",
          properties: { gender: { type: "string", enum: ["male", "female"] } },
          required: ["gender"],
        },
        ProfilePictureComplete: {
          type: "object",
          properties: { storageId: { type: "string" } },
          required: ["storageId"],
        },
        ProfilePictureUploadUrlResponse: {
          type: "object",
          properties: { uploadUrl: { type: "string", format: "uri" } },
          required: ["uploadUrl"],
        },
        EducationCreate: {
          type: "object",
          properties: {
            institution: { type: "string" },
            degree: { type: "string" },
            field: { type: "string" },
            startYear: { type: "number" },
            endYear: {
              oneOf: [
                { type: "number" },
                { type: "string", enum: ["Present"] },
              ],
            },
            description: { type: "string" },
          },
          required: ["institution", "degree"],
        },
        EducationUpdate: {
          type: "object",
          properties: {
            institution: { type: "string" },
            degree: { type: "string" },
            field: { type: "string" },
            startYear: { type: "number" },
            endYear: {
              oneOf: [
                { type: "number" },
                { type: "string", enum: ["Present"] },
              ],
            },
            description: { type: "string" },
          },
        },
        ExperienceCreate: {
          type: "object",
          properties: {
            title: { type: "string" },
            organization: { type: "string" },
            startDate: { type: "number" },
            endDate: { type: "number" },
            description: { type: "string" },
          },
          required: ["title", "organization"],
        },
        ExperienceUpdate: {
          type: "object",
          properties: {
            title: { type: "string" },
            organization: { type: "string" },
            startDate: { type: "number" },
            endDate: { type: "number" },
            description: { type: "string" },
          },
        },
        ProjectCreate: {
          type: "object",
          properties: {
            title: { type: "string" },
            period: { type: "string" },
            description: { type: "string" },
            url: { type: "string" },
          },
          required: ["title"],
        },
        ProjectUpdate: {
          type: "object",
          properties: {
            title: { type: "string" },
            period: { type: "string" },
            description: { type: "string" },
            url: { type: "string" },
          },
        },
        AwardCreate: {
          type: "object",
          properties: {
            title: { type: "string" },
            issuer: { type: "string" },
            year: { type: "number" },
          },
          required: ["title"],
        },
        AwardUpdate: {
          type: "object",
          properties: {
            title: { type: "string" },
            issuer: { type: "string" },
            year: { type: "number" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/mobile/auth/signout": {
        post: {
          tags: ["Auth"],
          summary: "Sign out (server-side cleanup)",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { ok: { type: "boolean" } },
                    required: ["ok"],
                  },
                },
              },
            },
          },
          security: [],
        },
      },
      "/api/mobile/auth/signin": {
        post: {
          tags: ["Auth"],
          summary: "Email/password sign-in",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                  required: ["email", "password"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Tokens",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      token: { type: "string" },
                      refreshToken: { type: "string" },
                    },
                    required: ["token", "refreshToken"],
                  },
                },
              },
            },
            "401": { description: "Invalid credentials or unverified" },
          },
          security: [],
        },
      },
      "/api/mobile/auth/request-otp": {
        post: {
          tags: ["Auth"],
          summary: "Request OTP",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { email: { type: "string", format: "email" } },
                  required: ["email"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { ok: { type: "boolean" } },
                    required: ["ok"],
                  },
                },
              },
            },
          },
          security: [],
        },
      },
      "/api/mobile/auth/verify-otp": {
        post: {
          tags: ["Auth"],
          summary: "Verify OTP for email confirmation",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", format: "email" },
                    code: { type: "string" },
                  },
                  required: ["email", "code"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Tokens",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      token: { type: "string" },
                      refreshToken: { type: "string" },
                    },
                    required: ["token", "refreshToken"],
                  },
                },
              },
            },
            "400": { description: "Invalid or expired code" },
          },
          security: [],
        },
      },
      "/api/mobile/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Refresh access token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { refreshToken: { type: "string" } },
                  required: ["refreshToken"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Tokens",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      token: { type: "string" },
                      refreshToken: { type: "string" },
                    },
                    required: ["token", "refreshToken"],
                  },
                },
              },
            },
          },
          security: [],
        },
      },
      "/api/chat/send": {
        post: {
          tags: ["Chat"],
          summary: "Send chat message",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    skillId: { type: "string" },
                    message: { type: "string" },
                    locale: { type: "string", enum: ["ar", "en"] },
                    conversationId: { type: "string" },
                  },
                  required: ["skillId", "message"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Created/continued session",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ChatSendResponse" },
                },
              },
            },
          },
        },
      },
      "/api/chat/status": {
        get: {
          tags: ["Chat"],
          summary: "Poll chat session status",
          parameters: [
            {
              name: "sessionId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Status",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ChatStatus" },
                },
              },
            },
          },
          security: [],
        },
      },
      "/api/mobile/v1/ai/config": {
        get: {
          tags: ["AI"],
          summary: "Get chat config",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AiConfig" },
                },
              },
            },
          },
        },
        post: {
          tags: ["AI"],
          summary: "Upsert chat config",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AiConfigUpsert" },
              },
            },
          },
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { _id: { type: "string" } },
                    required: ["_id"],
                  },
                },
              },
            },
          },
        },
      },
      "/api/mobile/v1/ai/skills": {
        get: {
          tags: ["AI"],
          summary: "List AI skills",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: { type: "object", additionalProperties: true },
                      },
                    },
                    required: ["items"],
                  },
                },
              },
            },
          },
        },
      },
      "/api/mobile/v1/ai/path/active": {
        get: {
          tags: ["AI"],
          summary: "Get active learning path",
          responses: {
            "200": {
              description: "Learning path",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LearningPath" },
                },
              },
            },
          },
        },
      },
      "/api/mobile/v1/ai/path": {
        get: {
          tags: ["AI"],
          summary: "Get learning path for skill",
          parameters: [
            {
              name: "aiSkillId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Learning path",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LearningPath" },
                },
              },
            },
          },
        },
      },
      "/api/mobile/v1/ai/path/complete-module": {
        post: {
          tags: ["AI"],
          summary: "Mark module completed",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    aiSkillId: { type: "string" },
                    moduleId: { type: "string" },
                  },
                  required: ["aiSkillId", "moduleId"],
                },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/ai/path/incomplete-module": {
        post: {
          tags: ["AI"],
          summary: "Mark module incomplete",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    aiSkillId: { type: "string" },
                    moduleId: { type: "string" },
                  },
                  required: ["aiSkillId", "moduleId"],
                },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/ai/path/unenroll": {
        post: {
          tags: ["AI"],
          summary: "Unenroll from learning path",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { aiSkillId: { type: "string" } },
                  required: ["aiSkillId"],
                },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/events": {
        get: {
          tags: ["Events"],
          summary: "List events",
          parameters: [
            { name: "q", in: "query", schema: { type: "string" } },
            { name: "regionId", in: "query", schema: { type: "string" } },
            { name: "cityId", in: "query", schema: { type: "string" } },
            { name: "from", in: "query", schema: { type: "string" } },
            { name: "to", in: "query", schema: { type: "string" } },
            { name: "publishedOnly", in: "query", schema: { type: "boolean" } },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "pageSize",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100 },
            },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/events/{id}": {
        get: {
          tags: ["Events"],
          summary: "Get event by id",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "OK" },
            "404": { description: "Not Found" },
          },
        },
      },
      "/api/mobile/v1/events/{id}/register": {
        post: {
          tags: ["Events"],
          summary: "Apply/register to event",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EventApplyRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Registered",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/EventRegistration" },
                },
              },
            },
            "409": {
              description: "Conflict (e.g., ALREADY_REGISTERED, EVENT_FULL)",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
          },
        },
      },
      "/api/mobile/v1/events/{id}/cancel": {
        post: {
          tags: ["Events"],
          summary: "Cancel my registration",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "OK" },
            "409": {
              description: "Conflict (NOT_REGISTERED)",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
          },
        },
      },
      "/api/mobile/v1/locations/regions": {
        get: {
          tags: ["Onboarding"],
          summary: "List regions",
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/locations/cities": {
        get: {
          tags: ["Onboarding"],
          summary: "List cities by region",
          parameters: [
            {
              name: "regionId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/onboarding/status": {
        get: {
          tags: ["Onboarding"],
          summary: "Get onboarding status",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OnboardingStatus" },
                },
              },
            },
          },
        },
      },
      "/api/mobile/v1/onboarding/draft": {
        get: {
          tags: ["Onboarding"],
          summary: "Get onboarding draft",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OnboardingDraft" },
                },
              },
            },
          },
        },
      },
      "/api/mobile/v1/onboarding/step": {
        post: {
          tags: ["Onboarding"],
          summary: "Set current onboarding step",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OnboardingStepRequest" },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/onboarding/save-draft-details": {
        post: {
          tags: ["Onboarding"],
          summary: "Save draft details",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SaveDraftDetailsRequest",
                },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/onboarding/save-draft-taxonomies": {
        post: {
          tags: ["Onboarding"],
          summary: "Save draft taxonomies",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SaveDraftTaxonomiesRequest",
                },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/onboarding/complete": {
        post: {
          tags: ["Onboarding"],
          summary: "Complete onboarding",
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/profile/me": {
        get: {
          tags: ["Profile"],
          summary: "Get my profile composite",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ProfileComposite" },
                },
              },
            },
          },
        },
      },
      "/api/mobile/v1/profile/basics": {
        post: {
          tags: ["Profile"],
          summary: "Update basic profile fields",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProfileBasicsUpdate" },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/profile/phone": {
        post: {
          tags: ["Profile"],
          summary: "Update phone number",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProfilePhoneUpdate" },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/profile/gender": {
        post: {
          tags: ["Profile"],
          summary: "Update gender",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProfileGenderUpdate" },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/profile/picture/upload-url": {
        get: {
          tags: ["Profile"],
          summary: "Get upload URL for profile picture",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ProfilePictureUploadUrlResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/api/mobile/v1/profile/picture/complete": {
        post: {
          tags: ["Profile"],
          summary: "Complete profile picture upload (by storageId)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProfilePictureComplete" },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/profile/education": {
        post: {
          tags: ["Profile"],
          summary: "Create education",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EducationCreate" },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/profile/education/{id}": {
        patch: {
          tags: ["Profile"],
          summary: "Update education",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EducationUpdate" },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
        delete: {
          tags: ["Profile"],
          summary: "Delete education",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/profile/experience": {
        post: {
          tags: ["Profile"],
          summary: "Create experience",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ExperienceCreate" },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/profile/experience/{id}": {
        patch: {
          tags: ["Profile"],
          summary: "Update experience",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ExperienceUpdate" },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
        delete: {
          tags: ["Profile"],
          summary: "Delete experience",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/profile/projects": {
        post: {
          tags: ["Profile"],
          summary: "Create project",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProjectCreate" },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/profile/projects/{id}": {
        patch: {
          tags: ["Profile"],
          summary: "Update project",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProjectUpdate" },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
        delete: {
          tags: ["Profile"],
          summary: "Delete project",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/profile/awards": {
        post: {
          tags: ["Profile"],
          summary: "Create award",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AwardCreate" },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/mobile/v1/profile/awards/{id}": {
        patch: {
          tags: ["Profile"],
          summary: "Update award",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AwardUpdate" },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
        delete: {
          tags: ["Profile"],
          summary: "Delete award",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
    },
  } as const;

  return NextResponse.json(spec as unknown as Record<string, unknown>);
}
