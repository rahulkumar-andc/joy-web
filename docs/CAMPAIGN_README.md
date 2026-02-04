# 🎯 Campaign Hero System - Complete Guide

## Overview

The Campaign Hero System is a premium, enterprise-grade hero section for your e-commerce platform featuring:

- ✨ **Parallax Scrolling** - Smooth depth effects
- 🪟 **Glassmorphism Design** - Modern frosted glass overlays
- 🎠 **Auto-Carousel** - Multiple campaigns with smooth transitions
- 📊 **Analytics Tracking** - Impressions, clicks, CTR
- ⏱️ **Countdown Timer** - Urgency for limited offers
- 🎬 **Video Support** - Background video (always muted)
- 🧪 **A/B Testing** - Split traffic, auto-promote winners
- 📅 **Campaign Scheduling** - Cron-like activation
- 🎯 **Personalization** - Geo, device, cart targeting
- ♿ **Accessibility** - ARIA, reduced motion support
- 🔒 **GDPR Compliance** - Cookie consent, data export

---

## 📁 File Structure

```
├── client/src/
│   ├── modules/hero/
│   │   ├── components/
│   │   │   ├── HeroSystem.tsx       # Main container
│   │   │   ├── HeroCarousel.tsx     # Multi-campaign carousel
│   │   │   ├── HeroMedia.tsx        # Lazy loading, WebP support
│   │   │   ├── HeroOverlay.tsx      # Glassmorphism + CTAs
│   │   │   ├── CountdownTimer.tsx   # Animated countdown
│   │   │   └── SocialProof.tsx      # Live counter
│   │   └── hooks/
│   │       └── useHeroCampaigns.ts  # Data fetching
│   ├── pages/admin/
│   │   ├── AdminCampaigns.tsx       # Campaign management
│   │   ├── AnalyticsDashboard.tsx   # CTR visualization
│   │   ├── ContentModeration.tsx    # Approval workflow
│   │   ├── CampaignPreview.tsx      # Device preview modal
│   │   └── CampaignTemplates.tsx    # 6 pre-built templates
│   └── components/
│       └── GDPRCompliance.tsx       # Cookie consent
│
├── server/modules/hero/
│   ├── index.ts                     # System initialization
│   ├── routes.ts                    # API endpoints
│   ├── repository.ts                # Database operations
│   ├── service.ts                   # Business logic
│   ├── ab-testing.ts                # Variant selection
│   ├── scheduler.ts                 # Cron-like scheduler
│   └── personalization.ts           # Targeting rules
│
└── shared/schema.ts                 # Database schema
```

---

## 🚀 Quick Start

### 1. Basic Usage

The hero system automatically displays on the homepage:

```tsx
import { HeroSystem } from "@/modules/hero/components/HeroSystem";

export default function HomePage() {
  return (
    <>
      <HeroSystem />
      {/* Rest of your page */}
    </>
  );
}
```

### 2. Admin Panel Routes

| Route | Description |
|-------|-------------|
| `/admin/campaigns` | Create/edit/delete campaigns |
| `/admin/analytics` | View CTR, export CSV |
| `/admin/moderation` | Approve/reject queue |
| `/privacy-settings` | User privacy controls |

---

## 🎨 Features

### A/B Testing

Split traffic between variants and auto-promote winners:

```typescript
// Create variant
POST /api/admin/hero/:id/variants
{
  "variantName": "B",
  "trafficPercentage": 50,
  "mediaUrl": "https://...",
  "title": "Alternative Headline"
}

// Auto-promote winner (min 100 impressions)
POST /api/admin/hero/:id/auto-promote
{ "minImpressions": 100 }
```

### Campaign Scheduling

Schedule campaigns with recurring patterns:

```typescript
POST /api/admin/hero/:id/schedules
{
  "activateAt": "2026-02-01T00:00:00Z",
  "deactivateAt": "2026-02-07T23:59:59Z",
  "recurrence": "weekly" // none, daily, weekly, monthly
}
```

### Personalization Rules

Target specific audiences:

```typescript
// Geo-targeting
geoTargets: ["US", "CA", "IN"]

// Device targeting
deviceTargets: ["mobile", "desktop"]

// Cart value range
minCartValue: "50.00"
maxCartValue: "200.00"

// User segments
userSegments: ["new", "returning", "vip"]
```

### Animation Options

Choose animation style per campaign:

```typescript
animationType: "fade" | "slide" | "zoom" | "none"
```

---

## 📊 API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hero` | Get active campaigns |
| POST | `/api/hero/analytics` | Track impression/click |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/hero` | List all campaigns |
| POST | `/api/admin/hero` | Create campaign |
| PUT | `/api/admin/hero/:id` | Update campaign |
| DELETE | `/api/admin/hero/:id` | Delete campaign |
| GET | `/api/admin/hero/:id/variants` | List variants |
| POST | `/api/admin/hero/:id/variants` | Create variant |
| POST | `/api/admin/hero/:id/auto-promote` | Promote winner |
| GET | `/api/admin/hero/:id/schedules` | List schedules |
| POST | `/api/admin/hero/:id/schedules` | Create schedule |

---

## 🎯 Campaign Templates

6 pre-built templates available:

| Template | Use Case |
|----------|----------|
| **Flash Sale** | Time-limited deals with countdown |
| **New Arrivals** | Showcase latest products |
| **Seasonal Event** | Holiday promotions |
| **Clearance** | End-of-stock sales |
| **Gift Guide** | Gifting season |
| **Summer Vibes** | Seasonal collection |

---

## 📱 Mobile Optimization

- **Responsive text sizing** - Smaller on mobile
- **Touch-friendly CTAs** - Larger tap targets
- **Lazy loading** - Only load visible slides
- **WebP optimization** - Auto-convert for CDNs

---

## ♿ Accessibility

- ARIA labels throughout
- Keyboard navigation (Arrow keys)
- `prefers-reduced-motion` support
- High contrast text (configurable)
- Focus indicators on CTAs

---

## � GDPR Compliance

### Cookie Consent Banner
Shows on first visit, blocks analytics until accepted.

### Privacy Settings Page (`/privacy-settings`)
- Toggle analytics on/off
- Export personal data
- Delete all data ("right to be forgotten")
---

## 🧊 Edge Caching (Performance)

The hero system is optimized for CDN edge caching with automatic cache invalidation.

### Cache Headers

All public endpoints return:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=300
Surrogate-Control: max-age=60
Cache-Tag: hero-campaigns
```

**What this means:**
- CDN caches for 60 seconds (`s-maxage=60`)
- Serves stale content while fetching fresh for 5 minutes (`stale-while-revalidate=300`)
- Automatic invalidation on admin publish/update

### CDN Configuration

**Cloudflare:**
```env
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token
```

**Vercel:**
```env
VERCEL_URL=your-app.vercel.app
REVALIDATE_TOKEN=your_secret_token
```

**Fastly:**
```env
FASTLY_SERVICE_ID=your_service_id
FASTLY_API_KEY=your_api_key
```

### Admin Cache API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/hero/cache/purge` | Manually purge all CDNs |
| GET | `/api/admin/hero/cache/status` | View cache config |

### Cache Flow

```
User Request
    ↓
CDN Edge (60s cache)
    ↓ (cache miss)
Origin Server (60s in-memory)
    ↓ (cache miss)
Database
```

---

## 💡 Best Practices

### Image Guidelines
- **Recommended size**: 1920x1080px (16:9)
- **Format**: WebP preferred, JPG fallback
- **File size**: Under 500KB
- **Content**: Keep important elements centered

### Campaign Strategy
1. **Test headlines** - Use A/B testing
2. **Create urgency** - Add countdown timers
3. **Target audience** - Use personalization
4. **Monitor CTR** - Aim for >2%
5. **Rotate regularly** - Fresh content weekly

---

## �️ Troubleshooting

### Video Not Playing
- Ensure URL ends with `.mp4` or `.webm`
- Videos are always muted (browser requirement)
- Check CORS if using external URLs

### Campaign Not Showing
- Verify `isActive: true`
- Check date range (start/end time)
- Confirm targeting matches user context
- Check priority (higher = shown first)

### Low CTR
- Test different headlines (A/B)
- Make CTA more prominent
- Add urgency (countdown)
- Improve targeting

---

## 📈 Changelog

### v2.0.0 (Latest)
- ✅ A/B Testing with auto-promote
- ✅ Campaign Scheduling (recurring)
- ✅ Advanced Analytics Dashboard
- ✅ Personalization (geo, device, cart)
- ✅ Social Proof counter
- ✅ Content Moderation queue
- ✅ GDPR Compliance (cookie consent)
- ✅ Campaign Templates (6 types)
- ✅ Device Preview modal
- ✅ Accessibility (ARIA, reduced motion)
- ✅ Animation options (fade/slide/zoom)
- ✅ Lazy loading + WebP support
- ✅ Edge Caching (Cloudflare, Vercel, Fastly)

### v1.0.0
- Initial release with parallax, glassmorphism, carousel
