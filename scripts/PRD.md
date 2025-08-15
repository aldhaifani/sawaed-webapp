# PRODUCT REQUIREMENTS DOCUMENT (PRD)

# SAWAED: National Youth Talent Ecosystem

Version 1.0
Author: Tareq Aldhaifani

## Executive Summary

Sawaed is a national, bilingual (Arabic/English) web platform serving as the central ecosystem for discovering, developing, and connecting the talents of Omani youth. For MVP, the focus is on three core pillars:

- Dynamic Profile (skills-first, bilingual)
- Opportunities Portal (curated national opportunities with one-click registration)
- Ministry Admin Portal (anonymous, aggregated insights)

Subsequent phases will introduce AI-powered learning paths, community features, and advanced analytics. The platform aligns with Oman Vision 2040 by empowering youth growth and enabling evidence-based policymaking.

## Problem Statement

Oman’s youth development efforts face:

- No unified, real-time view of youth skills to inform policy.
- Youth lack a modern, structured way to showcase skills and projects.
- Fragmented discovery of opportunities and programs.
- Difficulty connecting with peers for collaboration.

## Product Goals (MVP-first)

1. Achieve a 70% average profile completion rate among active users.
2. Increase youth engagement with national opportunities by 40%.
3. Reduce the Ministry’s reliance on manual surveys for data collection by 90%.
4. Ensure full accessibility and bilingual functionality (Arabic/English).
5. Deliver an anonymous, aggregated dashboard for policymakers with fast load times.

(Post-MVP)

- Provide personalized learning paths to 50% of active users within 6 months.
- Become the primary platform for youth peer-to-peer collaboration in Oman.

## User Personas

- Primary: Tareq (Ambitious Youth), 19, seeks to build a portfolio and find opportunities/collaborators.
- Secondary: Ms. Fatima (Ministry Strategist), needs aggregated insights to plan and justify programs.
- Tertiary: Khalid (Youth Center Coordinator), posts and manages youth-targeted workshops/events.

## Ideal Customer Profile

- Omani youth aged 15–29
- Ministry of Culture, Sports and Youth
- Youth Centers and related government bodies
- Educational institutions
- Private sector (CSR/recruitment)

## MVP Scope and Priorities

The MVP must deliver the following, in priority order:

1. Authentication & Internationalization (Foundational)

- Passwordless login (OTP via email).
- Full bilingual UI (Arabic/English) with persistent language preference.
- Role-based access (youth, admin, superadmin).

2. Dynamic Profile Management (Skills-first)

- Core profile (bio, photo, contact info).
- Standardized, tag-based skills from a master list.
- Bilingual support for all user-generated content fields.

3. Opportunities Portal

- Dedicated listing page to browse/search opportunities.
- Simple, secure interface for authorized admins to post/manage events.
- Detailed opportunity view (description, location, dates).
- One-click registration for logged-in youth.
- All listings bilingual.

4. Ministry Admin Portal (Read-only)

- Role-based access restricted to ministry personnel.
- Anonymous, aggregated data only (no PII).
- At least two key charts (e.g., youth distribution by governorate, top skills).
- Fast load (≤5 seconds).

5. Onboarding (P1 within MVP)

- Streamlined onboarding flow for youth profile creation and skills selection.

## Post-MVP (Phase: AI-related features)

- AI-Powered Learning Paths:
  - Conversational assessment to gauge proficiency.
  - Personalized learning path with modules/steps.
  - Integrate relevant platform opportunities.
  - Progress tracking and nudges.

## Phase 2 (Additional features after AI)

- Community & Networking:
  - Searchable/Filterable user directory (skills, interests, location, collaboration status).
  - Secure, real-time one-to-one messaging.
- Enhanced Profiles:
  - Modular sections (Projects, Talents, Hobbies).
  - Gamified profile completion tracker.
  - Shareable public profile link.
- Enhanced Ministry Portal:
  - Interactive charts, maps, filters by region/skill/interest.
  - Export data and charts.
- Opportunities Enhancements:
  - AI-driven opportunity suggestions based on profile.
- Authentication Enhancements:
  - Phone number OTP.

## Feature Specifications

### 1. Authentication & Internationalization (MVP)

Description: Secure, passwordless login and full bilingual UI.

Core Requirements:

- Email OTP-based authentication.
- Bilingual Arabic/English across all UI and content fields.
- Persistent language preference per user.

User Stories:

- As a user, I want to log in with a code sent to my email.
- As an Arabic-speaking user, I want the entire interface in Arabic.

Acceptance Criteria:

- Auth is handled by Convex Auth (Convex built-in auth).
- All UI text and system text translated and rendered RTL where appropriate.
- Language preference saved and respected across sessions.

### 2. Dynamic Profile Management (MVP)

Description: A modern, skills-first digital portfolio.

Core Requirements:

- Profile sections: bio, photo, contact info.
- Master skills taxonomy with standardized tags.
- Bilingual entry and display.

User Stories:

- As a youth, I want to select skills from a predefined list.
- As a user, I want to complete my profile in Arabic or English.

Acceptance Criteria:

- A user can create a profile, add a bio, and select at least five skills.
- Correct display and storage of both Arabic and English text.

(Post-MVP add-ons in Phase 2)

- Projects, Talents, Hobbies sections.
- Gamified completion tracker.
- Shareable public profile URL.

### 3. Opportunities Portal (MVP)

Description: Curated, centralized opportunities with one-click registration.

Core Requirements:

- Browse/search opportunities list.
- Admin interface for posting/managing events.
- Opportunity detail view.
- One-click registration (auto-fill from profile).
- Bilingual listings.

User Stories:

- As a youth, I want one place for official workshops/events.
- As a Youth Center admin, I want to post a workshop easily.
- As a youth, I want to register with one click.

Acceptance Criteria:

- All listings available in Arabic and English.
- Admin posting interface is simple and secure.
- Registrations recorded instantly in the central database.

(Post-MVP)

- AI suggestions for relevant opportunities.

### 4. Ministry Admin Portal (MVP)

Description: Anonymous, aggregated analytics for policymakers.

Core Requirements:

- Role-based, restricted access.
- No PII—aggregated only.
- Charts: youth distribution by governorate; top skills.

User Stories:

- As a strategist, I want a high-level chart of youth locations.
- As a director, I want to see the most popular skills.

Acceptance Criteria:

- Enforced anonymity; impossible to trace back to an individual.
- Dashboard loads within 5 seconds.
- Bilingual portal.

(Post-MVP in Phase 2)

- Interactive maps/filters, export.

### 5. AI-Powered Learning Paths (Post-MVP)

Description: Assessment-driven, personalized learning journeys.

Core Requirements:

- Conversational assessment.
- Dynamic path with modules and steps.
- Integrate opportunities into the path.
- Progress tracking.

### 6. Community & Networking (Phase 2)

Description: Connect and collaborate with peers.

Core Requirements:

- Directory with filters (skills, interests, location, collaboration status).
- Secure, real-time private messaging.

## Technical Requirements

### Tech Stack (Updated)

- Frontend: Next.js 15, React, TypeScript
- Backend/Realtime/DB/Auth: Convex (database, auth, serverless functions, file storage)
- Error Monitoring: Sentry
- Product Analytics: PostHog
- Deployment/Hosting: Vercel (frontend), Convex cloud
- Email (if needed beyond Convex integrations): Resend (optional fallback)

### Technical Prerequisites (Before Development Sprints)

1. Convex setup:
   - Convex Auth configured for passwordless email OTP
   - Schema for DB models and indexes
   - Role-based access control scaffolding
2. Sentry integration:
   - Client and server error monitoring
   - Source maps, environment tagging, performance tracing
3. PostHog integration:
   - Event schema (auth success, profile updated, skill selected, opportunity viewed, registration completed, dashboard viewed)
   - Feature flags for progressive rollout
4. Begin feature development after the above are verified in staging.

### Core Architecture

- App: Next.js 15 App Router with React Server Components where beneficial
- API/Server: Convex functions (queries/mutations/actions) as the primary backend
- Data: Convex as primary real-time database and file storage
- i18n: Next.js internationalization (Arabic RTL + English LTR)
- Auth: Convex Auth (email OTP)
- Monitoring/Analytics: Sentry, PostHog
- CI/CD: Vercel deployments with preview environments; type-safe checks and linting in CI

### Data Models (MVP)

- User: id, email, role (youth | admin | superadmin), language_preference, created_at
- Profile: id, user_id, headline, bio, location, picture_url
- Skill: id, name_en, name_ar, category (optional)
- User_Skills: id, user_id, skill_id, proficiency (optional), added_at
- Event: id, title_en, title_ar, description_en, description_ar, date_start, date_end (optional), location, created_by_admin_id, created_at, status (draft | published)
- Registration: id, user_id, event_id, timestamp, status (registered | cancelled)
- AuditLog (optional MVP): id, actor_id, action, target_type, target_id, timestamp

Indexes:

- User.role
- User_Skills.user_id, User_Skills.skill_id
- Event.status, Event.date_start
- Registration.user_id, Registration.event_id

### Security & Privacy

- TLS for all communications
- Convex Auth sessions and RBAC enforced in server-side functions
- Ministry dashboard serves only aggregated results (group-by queries); no raw user rows
- Strict separation of admin functions and youth endpoints
- PII minimization: Admin views never receive email, names, or picture URLs
- Sentry scrubbing of PII in error payloads
- Compliance: Clear privacy policy; data retention and deletion pathways

## Success Metrics & KPIs (MVP)

- Adoption: ≥1,000 active youth users in 3 months
- Engagement: ≥500 event registrations within 3 months
- Data Utility: Ministry stakeholders log in ≥1 time/week
- Retention: Month 1 retention >20%
- Satisfaction: Positive qualitative feedback from pilot cohorts
- Performance: Admin dashboard TTI ≤5s on standard connections

## Timeline & Milestones

Phase 0: Foundations (2–3 weeks)

- Technical prerequisites:
  - Convex (auth, DB schema, RBAC)
  - Sentry integrated
  - PostHog integrated
- Staging environment live

Phase 1: MVP Build (Up to 3 months total including Phase 0)

- P0:
  - Authentication & i18n framework (Convex Auth + bilingual UI)
  - Dynamic Profile (bio, photo, contact, skills)
  - Opportunities Portal (admin post/manage; youth browse/register)
  - Ministry Admin Portal (read-only; distribution by governorate, top skills)
- P1:
  - Onboarding flow for new users
  - Performance hardening and accessibility passes
  - Content seeding with Youth Centers

Phase: AI Features (Post-MVP)

- AI conversational assessment, personalized learning paths, progress tracking
- Opportunity integration into paths

Phase 2: Additional Features

- Community directory and private messaging
- Enhanced profiles (projects, talents, hobbies), gamification, shareable links
- Advanced Ministry analytics (maps, filters, export)
- AI opportunity suggestions
- Phone OTP

## Risks & Mitigations

- Low adoption or incomplete profiles
  - Mitigation: Frictionless onboarding; leverage Opportunities Portal value; prompts to add skills; lightweight gamification later.
- Scope creep
  - Mitigation: Enforce MVP boundaries; defer AI and community features per roadmap.
- Content scarcity for Opportunities Portal
  - Mitigation: Early partnership and publishing workflows with Youth Centers; templates and training.
- Privacy concerns
  - Mitigation: Transparent policy; strict aggregation; Sentry PII scrubbing; security audit before launch.
- Bilingual and RTL quality
  - Mitigation: Full i18n testing; professional translations; RTL UI reviews.

## Acceptance Criteria Summary (MVP)

- Authentication via Convex Auth email OTP; bilingual UI; language persists.
- User can create profile, add bio, upload photo, and select ≥2 skills from a master list.
- Opportunities Portal supports admin posting, bilingual listings, detail pages, and one-click registrations recorded in DB.
- Ministry dashboard shows aggregated charts (governorate distribution, top skills), loads ≤5s, reveals no PII.
- Sentry and PostHog are integrated and capturing key events/errors.
- Full Arabic/English coverage across UI; RTL verified.

## Analytics Events (Initial)

- auth: sign_up_started, sign_up_completed, sign_in_completed
- profile: created, bio_updated, skills_added, picture_uploaded
- opportunities: viewed_list, viewed_detail, registration_clicked, registration_completed
- admin: event_created, event_published
- ministry_dashboard: viewed, filter_changed (post-MVP)
- performance: dashboard_loaded_under_5s (custom metric)

## Non-Goals (MVP)

- AI learning paths, community messaging, public profile links, advanced filters/exports, phone OTP.
- Any PII exposure in ministry tools.
- Native mobile apps (web-first).
