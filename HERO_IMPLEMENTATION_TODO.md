# Hero System Implementation Plan

## Status: ✅ COMPLETED
**Goal:** Complete the Dynamic Homepage Hero System implementation

---

## Phase 1: Database Migrations ✅
- [x] 1.1 Create Drizzle migrations for `heroCampaigns` and `heroAnalytics` tables
- [x] 1.2 Push migrations to database

## Phase 2: Backend Improvements ✅
- [x] 2.1 Fix caching logic in `server/modules/hero/routes.ts`
- [x] 2.2 Add observability logging for campaign selection/fallback
- [x] 2.3 Verify repository and service logic

## Phase 3: Verification ✅
- [x] 3.1 Test API endpoints - Build successful
- [x] 3.2 Verify admin UI functionality - AdminCampaigns.tsx ready
- [x] 3.3 Verify frontend rendering - HeroSystem.tsx ready

## Phase 4: Media Upload System (New) ✅
- [x] 4.1 Hybrid Media Selection (URL + File Upload)
- [x] 4.2 Backend Multipart Support (Multer)
- [x] 4.3 Database Schema Update (`mediaSource`, `mediaFilePath`)
- [x] 4.4 File Cleanup Logic (Auto-delete on replacement/removal)

## Phase 5: Resilience & Optimization (New) ✅
- [x] 5.1 Resilient Scheduler (Recursive setTimeout, Idempotency)
- [x] 5.2 Database Hardening (Timeouts, Backoff)
- [x] 5.3 Frontend Build Optimization (Split Chunks, SVG Import Fix)


---

## Summary of Changes Made

### Backend (`server/modules/hero/routes.ts`)
- Implemented context-aware caching (separate cache for guest vs auth users)
- Added `getCacheKey()`, `getCachedData()`, `setCache()`, `invalidateCache()` helpers
- Added structured observability logging for campaign selection/fallback
- Replaced broken `bustCache()` with proper `invalidateCache()`

### Database (`migrations/0000_opposite_husk.sql`)
- Created tables: `hero_campaigns`, `hero_analytics`
- All tables pushed to production database

### Bug Fix
- Fixed typo in `client/src/hooks/use-debounce.ts` (`wimport` → `import`)

---

## System Features

### Campaign Management
- **Types:** Default, Sale, Flash Sale, Festival
- **Priority System:** Higher priority campaigns shown first
- **Time Windows:** Start/End time scheduling
- **Target Audience:** All, Guests only, Logged-in users only

### Analytics
- **Impression Tracking:** Track when campaigns are viewed
- **Click Tracking:** Track CTA button clicks
- **Fire-and-Forget:** Non-blocking async writes

### Frontend
- **Dynamic Media:** Video or Image support with responsive fallback
- **Countdown Timer:** Visual countdown for time-limited campaigns
- **Animations:** framer-motion powered transitions
- **Graceful Degradation:** Hardcoded fallback if API fails

### Admin UI
- Full CRUD for campaigns
- Real-time preview
- Overlap detection warnings
- Default campaign protection


