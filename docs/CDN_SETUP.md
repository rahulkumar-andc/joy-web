# CDN Setup Guide (Cloudflare)

This guide explains how to set up Cloudflare CDN for the application to improve performance and reduce server load.

## Prerequisites

1. A domain name (e.g., `stealthedeal.com`)
2. Cloudflare account (free tier works)
3. Access to your domain's DNS settings

## Step 1: Add Site to Cloudflare

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click "Add a Site"
3. Enter your domain name
4. Select the Free plan (or higher)
5. Cloudflare will scan your DNS records

## Step 2: Update Nameservers

1. Copy the Cloudflare nameservers provided
2. Log into your domain registrar
3. Replace existing nameservers with Cloudflare's
4. Wait for propagation (up to 24 hours)

## Step 3: Configure SSL/TLS

1. Go to **SSL/TLS** → **Overview**
2. Select **Full (strict)** mode
3. Go to **Edge Certificates**
4. Enable **Always Use HTTPS**
5. Enable **Automatic HTTPS Rewrites**

## Step 4: Configure Caching

### Page Rules (Free Plan)

Create 3 page rules in this order:

#### Rule 1: API No-Cache
- **URL:** `*stealthedeal.com/api/*`
- **Settings:**
  - Cache Level: Bypass
  - Disable Apps: On

#### Rule 2: Static Assets Cache
- **URL:** `*stealthedeal.com/assets/*`
- **Settings:**
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 year

#### Rule 3: Uploads Cache
- **URL:** `*stealthedeal.com/uploads/*`
- **Settings:**
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 day
  - Browser Cache TTL: 1 day

### Cache Rules (Better Alternative)

If using Business plan or higher, use Cache Rules instead:

```yaml
# Static assets (JS, CSS, fonts)
Match: (http.request.uri.path matches "^/assets/(.*)")
Cache: Eligible for cache
Edge TTL: 1 year
Browser TTL: 1 year
Cache Key: Default

# Product images in uploads
Match: (http.request.uri.path matches "^/uploads/(.*)")
Cache: Eligible for cache
Edge TTL: 7 days
Browser TTL: 1 day
Cache Key: Default

# API routes - bypass
Match: (http.request.uri.path matches "^/api/(.*)")
Cache: Bypass
```

## Step 5: Performance Settings

1. Go to **Speed** → **Optimization**
2. Enable:
   - Auto Minify: JavaScript, CSS, HTML
   - Brotli compression
   - Early Hints
   - Rocket Loader (optional - test first)

## Step 6: Security Settings

1. Go to **Security** → **Settings**
2. Set Security Level to **Medium** or **High**
3. Enable Bot Fight Mode
4. Configure Rate Limiting (optional)

## Cache Invalidation

When you update content, you may need to purge the cache:

### Purge Everything
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### Purge Specific Files
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://stealthedeal.com/assets/main.js"]}'
```

### Purge by Tag (Enterprise)
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"tags":["products","images"]}'
```

## Monitoring

1. Go to **Analytics & Logs** → **Traffic**
2. Monitor:
   - Cache hit ratio (aim for >90%)
   - Bandwidth saved
   - Requests served from edge

## Environment Variables

Add to `.env` for cache invalidation API calls:

```bash
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token_with_cache_purge
```

## Testing

Test your CDN setup:

```bash
# Check cache headers
curl -I https://stealthedeal.com/assets/main.js

# Look for:
# cf-cache-status: HIT (cached at edge)
# cf-cache-status: MISS (not cached, fetched from origin)
# cf-cache-status: DYNAMIC (not cached, configured to bypass)
```

## Troubleshooting

### Cache Not Working
1. Check Page Rules are active
2. Verify cache headers from origin (our server sends correct Cache-Control)
3. Check if Development Mode is accidentally enabled
4. Clear browser cache and test again

### API Not Working
1. Ensure API routes have "Bypass" cache rule
2. Check if Challenge Passage is blocking legitimate requests
3. Whitelist your IP for testing

---

*Last Updated: 2026-02-01*
