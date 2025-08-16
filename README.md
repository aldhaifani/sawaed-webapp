# Sawaed: National Youth Talent Ecosystem

Sawaed is a national, bilingual (Arabic/English) web platform designed to be the
central ecosystem for discovering, developing, and connecting the talents of
Omani youth. It empowers youth to showcase their skills and interests, discover
opportunities, and build their digital portfolio, while providing the Ministry
of Culture, Sports and Youth with anonymous, aggregated insights to inform
policy and strategy.

---

## 🚀 Project Overview

- **For Youth**: A modern, structured portfolio to showcase skills, interests,
  and achievements, plus a single trusted source for national opportunities.
- **For Ministry**: Real-time, anonymous insights into youth skills and
  interests across Oman.
- **For Youth Centers**: A simple way to post and manage events, workshops, and
  programs.

---

## 🧩 Core MVP Features

1. **Authentication & Internationalization**
   - Passwordless login (email OTP via Convex Auth)
   - Full bilingual support (Arabic RTL + English LTR)

2. **Dynamic Profile Management**
   - Bio, photo, contact info
   - Skills (from standardized taxonomy)
   - Interests (from standardized taxonomy)

3. **Opportunities Portal**
   - Admins can post/manage bilingual events
   - Youth can browse/search and register with one click

4. **Ministry Admin Portal**
   - Anonymous, aggregated insights
   - Charts: youth distribution by governorate, top skills, top interests

5. **Onboarding Flow**
   - Guided setup for new users to complete their profile quickly

---

## 📋 Profile Management Scope

| **Profile Section** | **MVP (Phase 1)**                       | **Phase 2 (Enhancements)**              |
| ------------------- | --------------------------------------- | --------------------------------------- |
| **Bio**             | ✅ Short bio/intro                      | —                                       |
| **Photo**           | ✅ Profile picture                      | —                                       |
| **Contact Info**    | ✅ Basic contact (email/phone optional) | —                                       |
| **Skills**          | ✅ Select from standardized taxonomy    | —                                       |
| **Interests**       | ✅ Select from standardized taxonomy    | —                                       |
| **Education**       | —                                       | ✅ Institution, degree, start/end dates |
| **Certificates**    | —                                       | ✅ Title, issuer, date awarded          |
| **Projects**        | —                                       | ✅ Title, description, media/link       |
| **Awards**          | —                                       | ✅ Title, issuer, date awarded          |
| **Gamification**    | —                                       | ✅ Profile completion tracker, badges   |
| **Public Profile**  | —                                       | ✅ Shareable link to showcase portfolio |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: Convex (DB, Auth, Functions, File Storage)
- **Monitoring**: Sentry (error tracking)
- **Analytics**: PostHog (event tracking, feature flags)
- **Hosting**: Vercel (frontend), Convex Cloud (backend)

---

## ⚙️ Technical Prerequisites

Before feature development begins, the following must be set up:

1. **Convex**
   - Auth (email OTP)
   - Database schema
   - Role-based access control (youth, admin, superadmin)

2. **Sentry**
   - Error monitoring (frontend + backend)
   - PII scrubbing enabled

3. **PostHog**
   - Event tracking (auth, profile updates, opportunity registrations, dashboard views)
   - Feature flags for progressive rollout

---

## 🗂️ Development Roadmap

### MVP (Phase 1)

- Authentication & i18n
- Profile (bio, photo, skills, interests)
- Opportunities Portal
- Ministry Admin Portal
- Onboarding flow

### Post-MVP (AI Features)

- AI-powered skill & interest assessment
- Personalized learning paths
- Progress tracking
- Integration of opportunities into learning paths

### Phase 2 (Additional Features)

- Community & Networking (directory + messaging)
- Enhanced Profiles (education, certificates, projects, awards, gamification, public profile)
- Advanced Ministry Portal (filters, maps, export)
- AI-driven opportunity suggestions
- Phone OTP authentication

---

## 🔒 Security & Privacy

- All communications encrypted with TLS
- Convex Auth sessions with strict RBAC
- Ministry dashboard only shows aggregated data (no PII)
- Sentry configured to scrub sensitive data

---

## 📊 Analytics Events (Initial)

- **Auth**: sign_up_started, sign_up_completed, sign_in_completed
- **Profile**: created, bio_updated, skills_added, interests_added
- **Opportunities**: viewed_list, viewed_detail, registration_completed
- **Admin**: event_created, event_published
- **Ministry Dashboard**: viewed

---

## 📄 License

This project is owned by Team Barmejha and is for the Barmejan Hackathon by Ministry of Culture, Sports and Youth, Oman. All rights reserved.
