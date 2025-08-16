<context>

# Overview

Sawaed is a national, bilingual (Arabic/English) web platform designed to be the central ecosystem for discovering, developing, and connecting the talents of Omani youth.

It solves two key problems:

1. **For Youth**: Lack of a unified, modern platform to showcase skills, interests, and achievements, and to discover opportunities.
2. **For Policymakers**: Lack of real-time, aggregated insights into youth skills, interests, and education to inform national strategy.

**Target Users**:

- Omani youth (15–29)
- Ministry of Culture, Sports and Youth
- Youth Centers and related government bodies
- Educational institutions
- Private sector (CSR/recruitment)

**Value Proposition**:

- Youth: A digital portfolio + access to curated opportunities.
- Ministry: Anonymous, aggregated insights for evidence-based policymaking.
- Youth Centers: A direct channel to promote events and track engagement.

---

# Core Features

### 1. Authentication & Internationalization (MVP)

- **What it does**: Provides secure, passwordless login (email OTP) and full bilingual support.
- **Why it’s important**: Ensures accessibility, inclusivity, and security.
- **How it works**: Convex Auth handles OTP login; UI supports Arabic (RTL) and English (LTR).

### 2. Dynamic Profile Management (MVP → Expanded in Phases)

- **What it does**: Lets youth create a structured, multi-dimensional digital portfolio.
- **Why it’s important**: Provides a standardized, analyzable way to showcase talents, interests, and achievements.
- **How it works**: Youth select skills and interests from master taxonomies, and progressively add education, certificates, projects, and awards.

**Profile Sections by Phase:**

- **MVP**: Bio, photo, contact info, **skills**, **interests**
- **Post-MVP (Phase 2)**: Education, certificates, projects, awards, gamified completion tracker, shareable public profile

### 3. Opportunities Portal (MVP)

- **What it does**: Centralized listing of workshops, events, and programs.
- **Why it’s important**: Youth gain a single trusted source for opportunities; admins can easily post and manage events.
- **How it works**: Admins create bilingual listings; youth browse/search and register with one click.

### 4. Ministry Admin Portal (MVP)

- **What it does**: Provides anonymous, aggregated insights into youth skills, interests, and distribution.
- **Why it’s important**: Enables data-driven policymaking without manual surveys.
- **How it works**: Convex queries aggregate data; dashboard visualizes charts (e.g., top skills, top interests, youth by governorate).

### 5. AI-Powered Learning Paths (Post-MVP)

- **What it does**: Personalized learning journeys based on skill and interest assessments.
- **Why it’s important**: Helps youth know what to learn next, contextualized to Oman.
- **How it works**: Conversational AI assessment → generates learning path → integrates opportunities.

### 6. Community & Networking (Phase 2)

- **What it does**: Connects youth with peers for collaboration.
- **Why it’s important**: Builds a national youth innovation network.
- **How it works**: Searchable directory + secure private messaging.

---

# User Experience

### User Personas

- **Tareq (Youth)**: Wants to showcase skills, interests, and achievements; find opportunities; and collaborate.
- **Ms. Fatima (Ministry Strategist)**: Needs aggregated insights into youth skills, interests, and education.
- **Khalid (Youth Center Admin)**: Wants to post events and track engagement.

### Key User Flows

1. **Youth Onboarding** → Sign up (OTP) → Select language → Create profile (bio, skills, interests) → Browse opportunities → Register.
2. **Admin Posting** → Log in → Create bilingual event → Publish → Track registrations.
3. **Ministry Strategist** → Log in → View dashboard → Explore aggregated charts (skills, interests, distribution).

### UI/UX Considerations

- Bilingual (Arabic RTL + English LTR).
- Mobile-first responsive design.
- Simple, frictionless onboarding.
- Accessibility (WCAG compliance).

</context>

---

<PRD>

# Technical Architecture

### System Components

- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: Convex (DB, Auth, Functions, File Storage)
- **Monitoring**: Sentry (error tracking)
- **Analytics**: PostHog (event tracking, feature flags)
- **Hosting**: Vercel (frontend), Convex Cloud (backend)

### Data Models (MVP → Expanded in Phases)

- **User**: id, email, role, language_preference, created_at
- **Profile**: id, user_id, bio, location, picture_url
- **Skill**: id, name_en, name_ar
- **Interest**: id, name_en, name_ar
- **User_Skills**: id, user_id, skill_id
- **User_Interests**: id, user_id, interest_id
- **Event**: id, title_en, title_ar, description_en, description_ar, date, location, created_by_admin_id
- **Registration**: id, user_id, event_id, timestamp

**Phase 2 Additions:**

- **Education**: id, user_id, institution, degree, start_date, end_date
- **Certificate**: id, user_id, title, issuer, date_awarded
- **Project**: id, user_id, title, description, link, media_url
- **Award**: id, user_id, title, issuer, date_awarded

### APIs & Integrations

- Convex Auth (email OTP)
- Convex Functions (queries/mutations)
- Sentry SDK (frontend + backend)
- PostHog SDK (frontend + backend)

### Infrastructure Requirements

- Convex project with schema + auth configured
- Vercel deployment pipeline with preview environments
- Sentry + PostHog integrated before feature development

---

# Development Roadmap

### MVP (Phase 1)

- Authentication & Internationalization (Convex Auth, bilingual UI)
- Dynamic Profile (bio, photo, **skills**, **interests**)
- Opportunities Portal (admin posting, youth browsing, one-click registration)
- Ministry Admin Portal (aggregated charts: youth by governorate, top skills, top interests)
- Onboarding flow

### Post-MVP (Phase: AI Features)

- AI-powered skill & interest assessment
- Personalized learning paths
- Progress tracking
- Integration of opportunities into learning paths

### Phase 2 (Additional Features)

- Community & Networking (directory + messaging)
- Enhanced Profiles:
  - Education
  - Certificates
  - Projects
  - Awards
  - Gamified completion tracker
  - Shareable public profile
- Advanced Ministry Portal (filters, maps, export)
- AI-driven opportunity suggestions
- Phone OTP authentication

---

# Logical Dependency Chain

1. **Foundations**
   - Convex setup (auth, DB schema, RBAC)
   - Sentry integration
   - PostHog integration

2. **Core MVP Features**
   - Authentication & i18n
   - Profile (bio, photo, skills, interests)
   - Opportunities Portal
   - Ministry Admin Portal

3. **Onboarding & UX Polish**
   - Guided onboarding flow
   - Accessibility & performance improvements

4. **AI Features (Post-MVP)**
   - Conversational assessment
   - Learning path generation

5. **Phase 2 Features**
   - Community networking
   - Enhanced profiles (education, certificates, projects, awards)
   - Advanced analytics

---

# Risks and Mitigations

- **Risk: Low adoption / incomplete profiles**
  - Mitigation: Frictionless onboarding, highlight Opportunities Portal value, progressive profile building.

- **Risk: Scope creep**
  - Mitigation: Strict MVP-first delivery; defer education/certificates/projects/awards to Phase 2.

- **Risk: Content scarcity in Opportunities Portal**
  - Mitigation: Early partnerships with Youth Centers; templates for event posting.

- **Risk: Privacy concerns**
  - Mitigation: Aggregated-only ministry data; strict RBAC; Sentry scrubbing PII.

- **Risk: Bilingual/RTL issues**
  - Mitigation: Professional translations; RTL UI testing.

---

# Appendix

### Research Findings

- Youth want a **portfolio beyond a CV**: skills, interests, education, certificates, projects, awards.
- Ministry needs **aggregated insights** into both skills and interests.
- Opportunities are scattered across multiple channels today.

### Technical Specifications

- Convex Auth for OTP login.
- Convex DB schema with indexes for performance.
- Sentry for error monitoring (scrub PII).
- PostHog for analytics (auth, profile, opportunities, dashboard).
- Next.js 15 App Router with React Server Components where beneficial.

</PRD>
