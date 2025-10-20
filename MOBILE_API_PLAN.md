# Sawaed Mobile API Plan

This plan defines the API surface to expose from the existing Next.js/Convex backend for a native SwiftUI app. It prioritizes a stable REST facade with bearer tokens, minimal DTOs, and reuse of existing Convex logic (RBAC, validations, i18n, chat, learning paths, profiles, events). It also outlines iOS consumption patterns and a phased rollout.

- **Scope**
  - Native SwiftUI client for the Youth role only.
  - Mobile-friendly REST routes under `/api/mobile/*` plus reuse of existing chat endpoints at `/api/chat/*`.
  - Authentication via Convex Auth (OTP first; password and Sign in with Apple optional later).

- **Goals**
  - **Stability**: Versioned mobile endpoints, minimal payloads, no browser cookie dependency.
  - **Security**: Bearer tokens, rate limits, and strict validation.
  - **Parity**: Reuse Convex functions already powering the web app.
  - **Performance**: ETag polling for chat streaming, pagination, filtered queries.

- **Non-Goals**
  - GraphQL or direct Convex client in iOS (no official Swift client; centralize logic in Next routes).

---

## 1) Authentication & Tokens

Leverage current `src/app/api/auth/route.ts`, which calls Convex Auth actions and sets httpOnly cookies for web. For mobile, expose explicit, cookie-free wrappers:

- `POST /api/mobile/auth/request-otp`
  - Body: `{ email: string }`
  - Effect: Triggers an OTP using the `ResendOTP` provider.
  - Response: `{ ok: true }`.

- `POST /api/mobile/auth/verify-otp`
  - Body: `{ email: string, code: string }`
  - Server internally calls `/api/auth` with `action: "auth:signIn"` and `args.params.code`.
  - Response: `{ token: string, refreshToken: string }`.

- `POST /api/mobile/auth/refresh`
  - Body: `{ refreshToken: string }`.
  - Response: `{ token: string, refreshToken: string }`.

- `POST /api/mobile/auth/signout`
  - Body: `{}` (optional).
  - Response: `{ ok: true }` and server best-effort invalidation.

- Headers for all mobile routes after login: `Authorization: Bearer <token>`.
- iOS should store `token` and `refreshToken` in Keychain and use automatic refresh on 401.

References:

- `convex/auth.ts` (providers: `Password` with `ResendOTP`, `ResendOTPPasswordReset`, and standalone `ResendOTP`).
- `src/app/api/auth/route.ts` (action proxy and token cookie handling for web).

---

## 2) Cross-cutting Concerns

- **Versioning**: Prefix mobile paths with `/api/mobile/v1/` to allow future breaking changes (v2) without impacting existing clients.
  - Exceptions (by design):
    - Auth routes live under `/api/mobile/auth/*` as a stable, protocol-like surface for token exchange; not tied to versioned DTOs.
    - Chat routes live under `/api/chat/*` shared by web and mobile to avoid duplication; streaming/status semantics are stable and covered by tests.
  - Optional: Provide thin versioned proxies (aliases) under `/api/mobile/v1/auth/*` and `/api/mobile/v1/chat/*` if strict URL consistency is desired in the future.
- **Localization**: Mobile sends `Accept-Language: ar|en` and/or `?locale=ar|en`. Server uses this to select language fields and to set AI chat language defaults, aligning with `appUsers.languagePreference`.
- **Error Model**: Standardize JSON errors:
  ```json
  { "error": { "code": "<machine_code>", "message": "Human-readable" } }
  ```

  - HTTP codes: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404, 409 (conflict), 429 (rate limit), 500.
- **Pagination**: Cursor or page-based with consistent keys:
  ```json
  { "items": [...], "nextCursor": "..." }
  ```
- **Rate Limits**: Per-IP + per-token. Chat status already uses light limits in `src/app/api/chat/status/route.ts`.
- **Observability**: Use Sentry as in current server files (`@sentry/nextjs`). Tag spans with `op` and route names. Log structured breadcrumbs for critical flows (auth, chat, learning path persistence).
- **CORS**: Mobile auth endpoints are protected against cross-origin POSTs. Requests with mismatched Origin/URL are rejected with 403.

---

## 3) Mobile API Endpoints (v1)

All endpoints expect `Authorization: Bearer <token>` unless noted.

### 3.1 Onboarding

Mirror youth onboarding flow found in `src/app/[locale]/(youth)/onboarding/page.tsx` and its Convex calls.

- `GET /api/mobile/v1/onboarding/status`
  - Returns current step and completion.
  - Convex: `api.onboarding.getStatus`.
  - Response:
    ```json
    {
      "completed": false,
      "currentStep": "profile|skills|interests|location|null"
    }
    ```

- `GET /api/mobile/v1/onboarding/draft`
  - Convex: `api.onboarding.getDraft`.
  - Response includes draft profile pieces and taxonomy IDs.

- `POST /api/mobile/v1/onboarding/step`
  - Body: `{ step: "profile|skills|interests|location" }`.
  - Convex: `api.onboarding.setStep`.

- `POST /api/mobile/v1/onboarding/save-draft-details`
  - Body example:
    ```json
    {
      "firstNameAr": "...",
      "lastNameAr": "...",
      "firstNameEn": "...",
      "lastNameEn": "...",
      "gender": "male|female",
      "regionId": "...",
      "cityId": "..."
    }
    ```
  - Convex: `api.onboarding.saveDraftDetails` (or individual mutations as applicable).

- `POST /api/mobile/v1/onboarding/save-draft-taxonomies`
  - Body: `{ skillIds: string[], interestIds: string[] }`.
  - Convex: `api.onboarding.saveDraftTaxonomies`.

- `POST /api/mobile/v1/onboarding/complete`
  - Applies draft fields to `profiles`, `userSkills`, `userInterests` and marks onboarding done.
  - Convex: `api.onboarding.upsertBasicDetails`, `api.onboarding.setUserTaxonomies`, `api.onboarding.complete`.

- `GET /api/mobile/v1/locations/regions`
  - Convex: `api.locations.listRegions`.

- `GET /api/mobile/v1/locations/cities?regionId=...`
  - Convex: `api.locations.listCitiesByRegion`.

### 3.2 Profile

Consolidate profile read and granular updates as used by `src/app/[locale]/(youth)/profile/page.tsx`.

- `GET /api/mobile/v1/profile/me`
  - Returns a composite used by dashboard/profile page.
  - Convex: `api.profiles.getMyProfileComposite`.

- `POST /api/mobile/v1/profile/basics`
  - Body: `{ headline?: string, bio?: string, regionId?: string, cityId?: string }`.
  - Convex: `api.profiles.upsertBasics` (or specific mutations present in repo).

- `POST /api/mobile/v1/profile/phone`
  - Body: `{ phone: string }` → `api.profiles.setPhone`.

- `POST /api/mobile/v1/profile/gender`
  - Body: `{ gender: "male|female" }` → `api.profiles.setGender`.

- `POST /api/mobile/v1/profile/picture`
  - Upload URL flow via server-signed URL or direct Convex storage helper.
  - Convex: storage mutation(s) used in profile page.

- Education/Experience/Projects/Awards CRUD
  - `POST /api/mobile/v1/profile/education`
  - `PATCH /api/mobile/v1/profile/education/:id`
  - `DELETE /api/mobile/v1/profile/education/:id`
  - Repeat for experiences, projects, awards using existing `api.profiles.*` mutations.

### 3.3 Learning (AI Assessment & Paths)

Matches `src/app/[locale]/(youth)/learning/page.tsx` and AI persistence in `src/app/api/chat/send/route.ts`.

- `GET /api/mobile/v1/ai/config`
  - Convex: `api.aiChatConfigs.getMyChatConfig`.

- `POST /api/mobile/v1/ai/config`
  - Body: `{ aiSkillId?: string, preferredLanguage: "ar|en", systemPrompt?: string }`.
  - Convex: `api.aiChatConfigs.upsertMyChatConfig`.

- `GET /api/mobile/v1/ai/path/active`
  - Most recent active path across skills.
  - Convex: `api.aiAssessments.getMyActiveLearningPath`.

- `GET /api/mobile/v1/ai/path?aiSkillId=...`
  - Convex: `api.aiAssessments.getLearningPath`.

- `POST /api/mobile/v1/ai/path/complete-module`
  - Body: `{ aiSkillId: string, moduleId: string }`.
  - Convex: `api.aiAssessments.markModuleCompleted`.

- `POST /api/mobile/v1/ai/path/incomplete-module`
  - Body: `{ aiSkillId: string, moduleId: string }`.
  - Convex: `api.aiAssessments.markModuleIncomplete`.

- `POST /api/mobile/v1/ai/path/unenroll`
  - Body: `{ aiSkillId: string }`.
  - Convex: `api.aiAssessments.unenrollLearningPath`.

- Optional: `GET /api/mobile/v1/ai/skills` as the list behind `SkillSelect`.

Status: Implemented. Endpoints now available under `/api/mobile/v1/ai/*`:

- `GET /api/mobile/v1/ai/config`
- `POST /api/mobile/v1/ai/config`
- `GET /api/mobile/v1/ai/path/active`
- `GET /api/mobile/v1/ai/path?aiSkillId=`
- `POST /api/mobile/v1/ai/path/complete-module`
- `POST /api/mobile/v1/ai/path/incomplete-module`
- `POST /api/mobile/v1/ai/path/unenroll`
- `GET /api/mobile/v1/ai/skills`

### 3.4 Chat (Reuse Existing Endpoints)

Keep the powerful existing implementation with minimal changes to accept bearer tokens when cookies are absent.

- `POST /api/chat/send`
  - Body: `{ skillId: string, message: string, locale?: "ar|en", conversationId?: string }`.
  - Response: `{ sessionId: string, conversationId?: string }`.
  - Behavior:
    - Creates/continues a `sessionId` in memory (`src/app/api/chat/send/_store`).
    - Streams via `status` endpoint.
    - Persists assessment JSON (when valid) to `aiAssessments` and creates/updates `aiLearningPaths`.
    - Persists assistant messages to `aiMessages` under `aiConversations`.

- `GET /api/chat/status?sessionId=...`
  - Response:
    ```json
    { "sessionId": "...", "status": "queued|running|partial|done|error", "text": "...", "updatedAt": 173..., "error": "?" }
    ```
  - Use `If-None-Match` and honor `ETag` from server for efficient polling.
  - Rate limited as in `src/app/api/chat/status/route.ts`.

- Required tweak: In `/api/chat/send`, accept bearer token from `Authorization` header and pass it as `options.token` to `fetchQuery/fetchMutation` (fallback when cookies absent). Status endpoint does not require auth.
- Status: Implemented. `/api/chat/send` now resolves bearer tokens (header-first, cookie fallback) and forwards `{ token }` to `fetchQuery/fetchMutation`. Status endpoint remains unauthenticated.

### 3.5 Opportunities (Events)

Matches `src/app/[locale]/(youth)/opportunities/page.tsx`.

- `GET /api/mobile/v1/events`
  - Query params: `q`, `regionId`, `cityId`, `from`, `to`, `publishedOnly`, `page`, `pageSize`.
  - Convex: `api.events.listPublicEventsPaginated`.
  - Response: `{ items: EventListItemDTO[], nextCursor?: string }`.

- `GET /api/mobile/v1/events/:id`
  - Convex: `api.events.getPublicEventById`.

- `POST /api/mobile/v1/events/:id/register`
  - Convex: `api.eventRegistrations.applyToEvent`.

- `POST /api/mobile/v1/events/:id/cancel`
  - Convex: `api.eventRegistrations.cancelMyRegistration`.

Status: Implemented. Endpoints now available under `/api/mobile/v1/events/*`:

- `GET /api/mobile/v1/events`
- `GET /api/mobile/v1/events/:id`
- `POST /api/mobile/v1/events/:id/register`
- `POST /api/mobile/v1/events/:id/cancel`

---

## 4) DTOs (Representative)

Return minimal, mobile-optimized objects.

- `ProfileCompositeDTO` (subset of `getMyProfileComposite`):

  ```json
  {
    "user": { "id": "...", "email": "...", "firstNameAr": "...", "firstNameEn": "...", "gender": "male|female|null", "pictureUrl": "..." },
    "profile": { "headline": "...", "bio": "...", "regionId": "...", "cityId": "...", "completionPercentage": 72 },
    "skills": [{ "id": "...", "name": "..." }],
    "interests": [{ "id": "...", "name": "..." }],
    "education": [...],
    "experiences": [...],
    "projects": [...],
    "awards": [...]
  }
  ```

- `LearningPathDTO` (maps to `aiLearningPaths`):

  ```json
  {
    "id": "...",
    "aiSkillId": "...",
    "status": "active|completed|archived",
    "assessmentLevel": 3,
    "completedModuleIds": ["m1", "m2"],
    "modules": [
      {
        "id": "m1",
        "title": "...",
        "type": "article|video|quiz|project",
        "duration": "12 min",
        "description": "...",
        "objectives": ["..."],
        "outline": ["..."],
        "resourceUrl": "...",
        "searchKeywords": ["..."]
      }
    ]
  }
  ```

- `ChatSendResponse` and `ChatStatus` as returned by existing routes.

- `EventListItemDTO` (derived from `events`):
  ```json
  {
    "id": "...",
    "title": "...",
    "description": "...",
    "startsAt": 173..., "endsAt": 173...,
    "city": "...", "region": "...",
    "posterUrl": "...",
    "isRegistrationRequired": true,
    "registrationPolicy": "open|approval|inviteOnly"
  }
  ```

---

## 5) Security & Validation

- Require bearer `Authorization` on all `/api/mobile/v1/*` routes.
- Extract token helper shared across routes:
  - Alignment choice: Fallback is implemented in `resolveConvexToken()` (Authorization header → Convex Next.js auth cookie → none). `getBearerToken()` remains header-only to keep utilities single-responsibility and predictable.
- Validate bodies with `zod` schemas (like current chat route uses `zod`).
- Ensure RBAC (Youth) via Convex queries (`api.rbac.currentUser`) when needed.
- Avoid leaking internal fields (e.g., reasoning in assessments unless intended).

---

## 6) Performance & Reliability

- Chat streaming status already optimized with ETag and a per-IP rate limiter.
- Add pagination and indexed filters for events, profiles sublists.
- Apply best-effort GC for chat sessions (already present in `status` and `send`).
- Use retries around AI calls with telemetry (see `generateWithRetry` pattern).

---

## 7) Observability (Sentry)

- Trace mobile routes with `Sentry.startSpan({ op: "http.route", name: "<METHOD> <path>" })`.
- Log key breadcrumbs: auth flows, chat persistence, validation failures.
- Capture exceptions in all route handlers.
- Consider extra tags: `user.role`, `mobile: true`, `locale`.

---

## 8) iOS Consumption Patterns (Minimal)

- HTTP client adds `Authorization` header; retries once after refresh on 401.
- For `/api/chat/status`: send `If-None-Match` with last ETag; adopt 350–500ms poll during streaming, backoff when idle; stop on `done|error`.
- Store `conversationId` per skill (e.g., `UserDefaults`) to continue threads.
- Keep functions small, immutable models, strict decoding; map server DTOs to Swift structs.

---

## 9) Implementation Plan (Backend)

- Step 1: Token helper and middleware-esque utilities
  - Create a small util to extract bearer token (Authorization header/cookies) and pass into `fetchQuery/fetchMutation` as `{ token }`.

- Step 2: Auth wrappers
  - Implement `/api/mobile/auth/request-otp`, `/verify-otp`, `/refresh`, `/signout` that proxy to existing `/api/auth` logic.

- Step 3: Mobile endpoints
  - `/api/mobile/v1/onboarding/*` mapping described above.
  - `/api/mobile/v1/profile/*` CRUD subsets.
  - `/api/mobile/v1/ai/*` for config and learning paths.
  - `/api/mobile/v1/events*` for list and detail.

- Step 4: Chat adjustments
  - Update `/api/chat/send` to accept bearer token when cookies are absent; otherwise unchanged.

- Step 5: Documentation & tests
  - Add route-level `zod` schemas and unit tests in `tests/` mirroring web patterns.
  - Publish Swagger UI at `/api/mobile/docs` backed by `/api/mobile/openapi.json`.

---

## 10) Phased Rollout & Backwards Compatibility

- v1: OTP auth, onboarding, profile read, events list/detail, AI config read/write, active learning path read, chat start/status.
- v1.1: Profile edits (education/experience/projects/awards), learning path progress mutations.
- v1.2: Event registration flow.
- Keep existing web behavior untouched; mobile routes are additive.

---

## 11) Open Questions

- Do we expose raw `reasoning` from assessments to youth or keep it server-internal?
- Should we provide a compact history endpoint for chat (past messages) to render conversation on iOS without fetching all `aiMessages`?
- Do we need a public skills/interest taxonomy endpoint for richer explore features?

---

## 12) File Map & References

- `convex/auth.ts`: Auth providers and user bootstrapping.
- `convex/schema.ts`: Data model definitions: `appUsers`, `profiles`, `education`, `experiences`, `projects`, `awards`, `userOnboarding`, `regions`, `cities`, `events`, `eventRegistrations`, `aiSkills`, `aiAssessments`, `aiLearningPaths`, `aiChatConfigs`, `aiConversations`, `aiMessages`.
- `src/app/api/auth/route.ts`: Auth action facade for web; to be wrapped for mobile.
- `src/app/api/chat/send/route.ts`: Chat generation, persistence, streaming session store.
- `src/app/api/chat/status/route.ts`: Polling with ETag and rate limiting.

---

## 13) Example cURL Calls

- Request OTP:

```bash
curl -X POST https://<host>/api/mobile/auth/request-otp \
  -H 'content-type: application/json' \
  -d '{"email": "user@example.com"}'
```

- Verify OTP (get tokens):

```bash
curl -X POST https://<host>/api/mobile/auth/verify-otp \
  -H 'content-type: application/json' \
  -d '{"email": "user@example.com", "code": "123456"}'
```

- Send chat message:

```bash
curl -X POST https://<host>/api/chat/send \
  -H 'authorization: Bearer <token>' \
  -H 'content-type: application/json' \
  -d '{"skillId": "sk_123", "message": "__start__", "locale": "ar"}'
```

- Poll status with ETag:

```bash
curl -i 'https://<host>/api/chat/status?sessionId=sess_abc' \
  -H 'if-none-match: "1733812012-120"'
```

---

## 14) SwiftUI Notes (Short)

- Organize features into modules: Auth, Onboarding, Dashboard, Learning, Chat, Opportunities, Profile.
- Use `URLSession` with a small `HTTPClient` that:
  - Adds `Authorization` from Keychain-stored token.
  - Refreshes once on 401 via `/api/mobile/auth/refresh`.
  - Decodes strict DTOs.
- Chat polling using `If-None-Match` to minimize traffic; stop on `done|error`.
- Persist `conversationId` per `aiSkillId` in `UserDefaults`.

---

## 15) SwiftUI Architecture (Detailed)

- **Project Structure**
  - `App/` app entry and DI bootstrap
  - `Features/` one folder per feature: `Auth`, `Onboarding`, `Dashboard`, `Learning`, `Chat`, `Opportunities`, `Profile`
  - `Networking/` `HTTPClient`, `RequestBuilder`, `Endpoints`, `Decoders`, models (DTOs)
  - `Storage/` `KeychainStore`, `UserDefaultsStore`
  - `Services/` cross-cutting: `AuthService`, `ChatPollingService`, `ImageUploadService`
  - `DesignSystem/` shared components and theming

- **State & Navigation**
  - Root `AppViewModel` holds auth state (`signedOut|signedIn|onboarding`) and locale `ar|en`
  - Feature-scoped `ViewModel`s (single responsibility, <20 LOC methods) with `@MainActor`
  - NavigationStack per feature; deep-links routed by `/api/mobile/v1/*` resource identifiers

- **Networking**
  - `HTTPClient` wraps `URLSession`
    - Adds `Authorization: Bearer <token>` from `KeychainStore`
    - Retries once on `401` via `/api/mobile/auth/refresh`, then replays original request
    - Decodes strictly with typed `Decoders` (fail-fast, no `Any`)
  - `Endpoints` define paths and query assembly for `/api/mobile/v1/*` and `/api/chat/*`

- **Error Handling**
  - Map server errors to lightweight `AppError { code: String, message: String }`
  - Show inline error banners on forms; global fallback toast for unknowns
  - Log non-PII breadcrumbs to Sentry iOS SDK

- **i18n**
  - `LocaleStore` backed by `UserDefaults`
  - Add `Accept-Language` to requests; server responds with bilingual fields consistent with plan

- **Chat Streaming**
  - `ChatPollingService` manages `GET /api/chat/status?sessionId=` with `If-None-Match`
  - Poll 350–500ms while `running|partial`; stop on `done|error`; backoff when idle
  - Persist `conversationId` per `aiSkillId` in `UserDefaults`

- **Caching**
  - Cache read-mostly data (regions, cities, skills) in memory with short TTL; warm on app start

- **Testing**
  - Unit tests for `HTTPClient` (token refresh), DTO decoding, and `ChatPollingService`
  - Snapshot tests for forms and lists in key screens

---

## 16) MVP Scope (Detailed)

- **v1 (Weeks 1–3)**
  - **Auth (OTP)**: `/api/mobile/auth/request-otp`, `/verify-otp`, `/refresh`
  - **Onboarding**: status, draft, save-draft-details, save-draft-taxonomies, complete, regions/cities
  - **Profile (Read)**: `/api/mobile/v1/profile/me`
  - **Learning (Read)**: `/api/mobile/v1/ai/config`, `/ai/path/active`, `/ai/path?aiSkillId=`
  - **Chat**: `POST /api/chat/send`, `GET /api/chat/status` with Bearer
  - **Opportunities**: `/api/mobile/v1/events`, `/api/mobile/v1/events/:id`

- **v1.1 (Weeks 4–5)**
  - **Profile (Edit)**: basics, phone, gender, picture upload; CRUD for education/experience/projects/awards
  - **Learning (Progress)**: complete-module, incomplete-module, unenroll

- **v1.2 (Week 6)**
  - **Event Registration**: register/unregister workflows mapped to `eventRegistrations`
  - Optional: compact chat history endpoint for iOS hydration

- **Acceptance Criteria**
  - All v1 endpoints return typed DTOs and standardized error envelopes
  - Token refresh flow verified end-to-end; chat polling honors ETag
  - Sentry traces present for all mobile routes

---

## 17) Detailed Tasks List

- **[foundation ✅] Token & Request Utilities**
  - Implement `getBearerToken(req: Request|NextRequest): string|null` (Authorization header → cookies fallback)
  - Create `withConvexToken<T>(handler, req)` helper to pass `{ token }` to `fetchQuery/fetchMutation`
  - Add shared `respondError(code, message, httpStatus)` utility to standardize error envelopes
  - Add request validation helpers using `zod` (parseJSONBody, parseQuery)

- **[auth ✅] Mobile Auth Routes**
  - `POST /api/mobile/auth/request-otp` → trigger `ResendOTP`
  - `POST /api/mobile/auth/verify-otp` → proxy to `/api/auth` `auth:signIn` with `{ params: { code } }`
  - `POST /api/mobile/auth/refresh` → proxy to `/api/auth` `auth:signIn` with `{ refreshToken }`
  - `POST /api/mobile/auth/signout` → clear server-side session state if any and return `{ ok: true }`
  - Implemented:
    - CORS protection (403 on mismatched Origin)
    - OTP code validation tightened to exactly 6 digits
    - Unit tests added: happy-path, invalid code, invalid refresh, CORS
    - Sentry spans for all auth routes

- **[onboarding ✅] Endpoints**
  - `GET /api/mobile/v1/onboarding/status` → `api.onboarding.getStatus`
  - `GET /api/mobile/v1/onboarding/draft` → `api.onboarding.getDraft`
  - `POST /api/mobile/v1/onboarding/step` → `api.onboarding.setStep`
  - `POST /api/mobile/v1/onboarding/save-draft-details` → `api.onboarding.saveDraftDetails`
  - `POST /api/mobile/v1/onboarding/save-draft-taxonomies` → `api.onboarding.saveDraftTaxonomies`
  - `POST /api/mobile/v1/onboarding/complete` → upsert basics, taxonomies, mark complete
  - Validation: zod schemas per body; ensure RBAC Youth
  - Tests: step transitions, draft persistence, complete idempotency
  - Implemented:
    - All above onboarding routes under `/api/mobile/v1/onboarding/*`
    - Supporting locations endpoints implemented: `/api/mobile/v1/locations/regions`, `/api/mobile/v1/locations/cities?regionId=` (locale from `Accept-Language` or `?locale`)

- **[profile ✅] Endpoints**
  - `GET /api/mobile/v1/profile/me` → `api.profiles.getMyProfileComposite`
  - `POST /api/mobile/v1/profile/basics` → upsert basics (headline/bio/regionId/cityId)
  - `POST /api/mobile/v1/profile/phone` → set phone
  - `POST /api/mobile/v1/profile/gender` → set gender
  - `POST /api/mobile/v1/profile/picture` → signed URL or storage upload flow
  - CRUD: education, experiences, projects, awards (`POST`, `PATCH`, `DELETE`)
  - Tests: DTO shape, field validation, 403 on role mismatch
  - Implemented:
    - `GET /api/mobile/v1/profile/me`
    - `POST /api/mobile/v1/profile/basics`
    - `POST /api/mobile/v1/profile/phone`
    - `POST /api/mobile/v1/profile/gender`
    - `GET /api/mobile/v1/profile/picture/upload-url` and `POST /api/mobile/v1/profile/picture/complete`
    - Education: `POST /api/mobile/v1/profile/education`, `PATCH|DELETE /api/mobile/v1/profile/education/:id`
    - Experience: `POST /api/mobile/v1/profile/experience`, `PATCH|DELETE /api/mobile/v1/profile/experience/:id`
    - Projects: `POST /api/mobile/v1/profile/projects`, `PATCH|DELETE /api/mobile/v1/profile/projects/:id`
    - Awards: `POST /api/mobile/v1/profile/awards`, `PATCH|DELETE /api/mobile/v1/profile/awards/:id`

- **[learning ✅] Endpoints**
  - `GET /api/mobile/v1/ai/config` / `POST /api/mobile/v1/ai/config`
  - `GET /api/mobile/v1/ai/path/active`
  - `GET /api/mobile/v1/ai/path?aiSkillId=`
  - `POST /api/mobile/v1/ai/path/complete-module`
  - `POST /api/mobile/v1/ai/path/incomplete-module`
  - `POST /api/mobile/v1/ai/path/unenroll`
  - Optional: `GET /api/mobile/v1/ai/skills` for picker
  - Tests: path existence, progress updates, unenroll effects
  - Implemented:
    - `GET /api/mobile/v1/ai/config`, `POST /api/mobile/v1/ai/config`
    - `GET /api/mobile/v1/ai/path/active`, `GET /api/mobile/v1/ai/path?aiSkillId=`
    - `POST /api/mobile/v1/ai/path/complete-module`, `POST /api/mobile/v1/ai/path/incomplete-module`, `POST /api/mobile/v1/ai/path/unenroll`
    - `GET /api/mobile/v1/ai/skills`

- **[chat ✅] Adjustments & Usage**
  - Update `POST /api/chat/send` to accept bearer token and pass to Convex
  - Confirm `GET /api/chat/status` ETag behavior and rate limit coverage
  - Tests: start/resume conversation, JSON detection persistence, streaming partials
  - Status:
    - `POST /api/chat/send` resolves bearer via `resolveConvexToken(req)` and forwards `{ token }` to Convex calls; returns `{ sessionId, conversationId }`
    - `GET /api/chat/status` uses ETag for efficient polling and enforces rate limiting

- **[events ✅] Endpoints**
  - `GET /api/mobile/v1/events` → filters: q, regionId, cityId, from, to, publishedOnly, page, pageSize
  - `GET /api/mobile/v1/events/:id`
  - `POST /api/mobile/v1/events/:id/register`
  - `POST /api/mobile/v1/events/:id/cancel`
  - Tests: pagination, filters, 404s, registration conflicts (e.g., ALREADY_REGISTERED, EVENT_FULL), cancel NOT_REGISTERED
  - Implemented:
    - `GET /api/mobile/v1/events` (pagination via cursor, `Accept-Language`-aware)
    - `GET /api/mobile/v1/events/:id`
    - `POST /api/mobile/v1/events/:id/register`
    - `POST /api/mobile/v1/events/:id/cancel`

- **[security ✅] & [observability ✅]**
  - Enforce bearer on all `/api/mobile/v1/*`
  - Add Sentry spans `op: http.route` with route names; breadcrumbs on validation failures
  - Apply per-token rate limits on write-heavy routes (auth, chat send)
  - Sanitize outputs (e.g., hide assessment `reasoning` if not intended for youth)
  - Implemented:
    - Bearer enforcement via `withConvexToken()` across `/api/mobile/v1/*`
    - Sentry route spans on all mobile routes; breadcrumbs in key flows
    - Chat endpoints have rate limiting and ETag on status
    - Assistant messages sanitize embedded assessment JSON

- **[docs] & [tooling]**
  - Update `MOBILE_API_PLAN.md` if contracts evolve (keep versioned)
  - Swagger/OpenAPI available at `GET /api/mobile/openapi.json` and interactive docs at `GET /api/mobile/docs`
  - Add README section explaining mobile auth and bearer usage

- **[ios] Client Scaffolding (Optional, for reference)**
  - Implement `HTTPClient`, `AuthService` (login/refresh/signout), `ChatPollingService`
  - Build ViewModels and basic screens for v1 features
  - Add Keychain storage and 401-refresh retry once policy

---

This plan keeps backend logic centralized in the existing Next/Convex code while exposing a clear, stable REST surface for the iOS app. It reuses Convex queries/mutations, enforces consistent security and observability, and provides enough structure for a fast, incremental rollout.
