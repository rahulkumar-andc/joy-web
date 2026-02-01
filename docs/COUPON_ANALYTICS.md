# Coupon Analytics Service Documentation

## Overview

The Coupon Analytics Service provides comprehensive insights into coupon performance, usage patterns, and revenue impact. This enables data-driven marketing decisions and helps optimize discount strategies.

---

## Features

### 📊 Core Analytics
- **Coupon Statistics**: Total usage, revenue, discount amounts
- **Revenue Impact**: Overall impact of coupons on business
- **ROI Calculation**: Return on investment for each coupon
- **Time Series Analysis**: Usage trends over time
- **User Behavior**: Individual user coupon usage history

### 🎯 Business Intelligence
- **Top Performers**: Identify best coupons by usage and revenue
- **Dashboard Summary**: Quick overview of key metrics
- **Conversion Tracking**: Measure coupon effectiveness
- **Segmentation**: Analyze by user groups, time periods

---

## API Endpoints

### Admin Endpoints

All admin endpoints require authentication and admin role.

#### 1. Dashboard Summary
```
GET /api/admin/analytics/coupons/dashboard
```

**Response:**
```json
{
  "period": "Last 30 Days",
  "revenueImpact": {
    "totalOrdersWithCoupons": 245,
    "totalRevenueWithCoupons": 487500,
    "totalDiscountGiven": 48750,
    "averageDiscountPerOrder": 199,
    "revenueAfterDiscount": 438750
  },
  "topCouponsByUsage": [
    {
      "couponId": 12,
      "code": "WELCOME10",
      "discountType": "percentage",
      "totalUsage": 85,
      "totalRevenue": 127500,
      "totalDiscountGiven": 12750,
      "averageOrderValue": 1500,
      "uniqueUsers": 82
    }
  ],
  "topCouponsByRevenue": [...]
}
```

#### 2. Coupon-Specific Statistics
```
GET /api/admin/analytics/coupons/:couponId
```

**Example:** `GET /api/admin/analytics/coupons/12`

**Response:**
```json
{
  "couponId": 12,
  "code": "WELCOME10",
  "discountType": "percentage",
  "totalUsage": 85,
  "totalRevenue": 127500,
  "totalDiscountGiven": 12750,
  "averageOrderValue": 1500,
  "uniqueUsers": 82
}
```

#### 3. ROI Calculation
```
GET /api/admin/analytics/coupons/:couponId/roi
```

**Response:**
```json
{
  "revenue": 127500,
  "discountGiven": 12750,
  "roi": 9.0,
  "roiPercentage": 900.0
}
```

**Interpretation:**
- ROI of 9.0 means for every ₹1 spent on discounts, you earned ₹9 in revenue
- 900% ROI indicates highly profitable coupon

#### 4. Time Series Data
```
GET /api/admin/analytics/coupons/:couponId/timeseries?startDate=2026-01-01&endDate=2026-01-31
```

**Response:**
```json
{
  "couponId": 12,
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-01-31T23:59:59.000Z",
  "data": [
    {
      "date": "2026-01-01",
      "usageCount": 5,
      "revenue": 7500,
      "discountAmount": 750
    },
    {
      "date": "2026-01-02",
      "usageCount": 8,
      "revenue": 12000,
      "discountAmount": 1200
    }
  ]
}
```

#### 5. Top Coupons by Usage
```
GET /api/admin/analytics/coupons/top/usage?limit=10
```

**Query Parameters:**
- `limit` (optional): Number of results (default: 10)

**Response:**
```json
[
  {
    "couponId": 12,
    "code": "WELCOME10",
    "totalUsage": 85,
    "totalRevenue": 127500,
    ...
  },
  ...
]
```

#### 6. Top Coupons by Revenue
```
GET /api/admin/analytics/coupons/top/revenue?limit=10
```

Similar response format, sorted by revenue instead of usage.

#### 7. Overall Revenue Impact
```
GET /api/admin/analytics/coupons/revenue-impact?startDate=2026-01-01&endDate=2026-01-31
```

**Query Parameters:**
- `startDate` (optional): Start date in ISO format
- `endDate` (optional): End date in ISO format

**Response:**
```json
{
  "totalOrdersWithCoupons": 245,
  "totalRevenueWithCoupons": 487500,
  "totalDiscountGiven": 48750,
  "averageDiscountPerOrder": 199,
  "revenueAfterDiscount": 438750
}
```

### User Endpoints

#### 8. User Coupon History
```
GET /api/user/analytics/coupons/history
```

Requires authentication. Shows logged-in user's coupon usage.

**Response:**
```json
{
  "totalCouponsUsed": 3,
  "totalSaved": 1250,
  "coupons": [
    {
      "couponId": 12,
      "couponCode": "WELCOME10",
      "discountType": "percentage",
      "orderId": 156,
      "orderTotal": "2500",
      "discountAmount": "250",
      "usedAt": "2026-01-15T10:30:00.000Z"
    },
    ...
  ]
}
```

---

## Usage Examples

### Admin Dashboard Integration

```typescript
import { couponAnalyticsService } from '../services/couponAnalyticsService';

// Get dashboard data
const summary = await couponAnalyticsService.getDashboardSummary();

console.log(`Total coupons used: ${summary.revenueImpact.totalOrdersWithCoupons}`);
console.log(`Total discount given: ₹${summary.revenueImpact.totalDiscountGiven}`);
console.log(`Net revenue: ₹${summary.revenueImpact.revenueAfterDiscount}`);
```

### Analyze Specific Coupon

```typescript
// Get detailed stats for a coupon
const stats = await couponAnalyticsService.getCouponStats(12);

if (stats) {
  console.log(`Code: ${stats.code}`);
  console.log(`Usage: ${stats.totalUsage} times`);
  console.log(`Revenue: ₹${stats.totalRevenue}`);
  console.log(`Unique users: ${stats.uniqueUsers}`);
}

// Calculate ROI
const roi = await couponAnalyticsService.calculateCouponROI(12);
console.log(`ROI: ${roi.roiPercentage.toFixed(2)}%`);
```

### Track Performance Over Time

```typescript
const startDate = new Date('2026-01-01');
const endDate = new Date('2026-01-31');

const timeSeries = await couponAnalyticsService.getCouponUsageTimeSeries(
  12,
  startDate,
  endDate
);

// Plot on chart
timeSeries.forEach(data => {
  console.log(`${data.date}: ${data.usageCount} uses, ₹${data.revenue} revenue`);
});
```

---

## Key Metrics Explained

### 1. Total Usage
Number of times the coupon has been used across all orders.

### 2. Total Revenue
Sum of order totals (before discount) for all orders using this coupon.

### 3. Total Discount Given
Sum of all discount amounts applied through this coupon.

### 4. Average Order Value
Average order total for orders using this coupon.
```
AOV = Total Revenue / Total Usage
```

### 5. Unique Users
Number of distinct users who have used this coupon.

### 6. ROI (Return on Investment)
```
ROI = (Revenue - Discount) / Discount
```

**Example:**
- Revenue: ₹10,000
- Discount: ₹1,000
- ROI = (10,000 - 1,000) / 1,000 = 9.0 (or 900%)

### 7. Revenue After Discount
Net revenue from coupon orders after applying discounts.
```
Net Revenue = Total Revenue - Total Discount
```

---

## Business Use Cases

### 1. Measure Campaign Effectiveness

```typescript
// Compare two promotional campaigns
const campaign1 = await couponAnalyticsService.getCouponStats(1);
const campaign2 = await couponAnalyticsService.getCouponStats(2);

console.log(`Campaign 1: ${campaign1.totalUsage} uses, ₹${campaign1.totalRevenue} revenue`);
console.log(`Campaign 2: ${campaign2.totalUsage} uses, ₹${campaign2.totalRevenue} revenue`);
```

### 2. Identify Top Performers

```typescript
// Find best coupons by revenue
const topCoupons = await couponAnalyticsService.getTopCouponsByRevenue(5);

topCoupons.forEach((coupon, index) => {
  console.log(`#${index + 1}: ${coupon.code} - ₹${coupon.totalRevenue}`);
});
```

### 3. Optimize Discount Strategy

```typescript
// Calculate ROI for all active coupons
const allCoupons = await db.select().from(coupons).where(eq(coupons.isActive, true));

for (const coupon of allCoupons) {
  const roi = await couponAnalyticsService.calculateCouponROI(coupon.id);
  
  if (roi.roiPercentage < 100) {
    console.warn(`⚠️ Coupon ${coupon.code} has low ROI: ${roi.roiPercentage}%`);
  }
}
```

### 4. User Segmentation

```typescript
// Analyze coupon usage by user segment
const stats = await couponAnalyticsService.getCouponStats(12);

console.log(`${stats.uniqueUsers} unique users`);
console.log(`Average uses per user: ${(stats.totalUsage / stats.uniqueUsers).toFixed(2)}`);
```

---

## Performance Optimization

### Caching Recommendations

```typescript
import { cache } from '../cache';

// Cache dashboard summary for 5 minutes
const getCachedDashboard = async () => {
  const cacheKey = 'coupon-analytics:dashboard';
  
  let summary = await cache.get(cacheKey);
  
  if (!summary) {
    summary = await couponAnalyticsService.getDashboardSummary();
    await cache.set(cacheKey, summary, 300); // 5 minutes TTL
  }
  
  return summary;
};
```

### Database Indexing

Ensure the following indexes exist for optimal performance:

```sql
-- Index on couponUsage for faster queries
CREATE INDEX idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user_id ON coupon_usage(user_id);
CREATE INDEX idx_coupon_usage_order_id ON coupon_usage(order_id);

-- Index on orders for date range queries
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

---

## Future Enhancements

- [ ] **Cohort Analysis**: Track user retention after first coupon use
- [ ] **A/B Testing**: Compare different coupon strategies
- [ ] **Predictive Analytics**: Forecast coupon performance
- [ ] **Segmentation**: Analyze by user demographics
- [ ] **Export Reports**: Generate CSV/PDF reports
- [ ] **Real-time Alerts**: Notify when coupon performance changes
- [ ] **Social Sharing**: Track coupon sharing and referrals

---

## Monitoring

### Key Metrics to Track

1. **Daily Active Coupons**: Number of unique coupons used each day
2. **Coupon Adoption Rate**: % of orders using coupons
3. **Average Discount Rate**: Average discount as % of order value
4. **Revenue Leakage**: Discounts given vs. incremental revenue

### Analytics Events

```javascript
// Track when analytics accessed
analytics.track('Coupon Analytics Viewed', {
  adminId: userId,
  couponId: couponId,
  metric: 'roi'
});

// Track ROI thresholds
analytics.track('Low ROI Detected', {
  couponId: couponId,
  code: coupon.code,
  roi: roiPercentage
});
```

---

## Troubleshooting

### Issue: Slow Query Performance

**Solution:** Ensure indexes are created and use date range filters:

```typescript
// ✅ Good - with date filter
const impact = await couponAnalyticsService.getRevenueImpact(
  new Date('2026-01-01'),
  new Date('2026-01-31')
);

// ❌ Bad - without date filter (scans all data)
const impact = await couponAnalyticsService.getRevenueImpact();
```

### Issue: Inconsistent Data

**Solution:** Ensure `couponUsage` is recorded atomically with order creation:

```typescript
await db.transaction(async (tx) => {
  // Create order
  const order = await tx.insert(orders).values({...}).returning();
  
  // Record coupon usage
  if (couponId) {
    await tx.insert(couponUsage).values({
      couponId,
      userId,
      orderId: order.id
    });
  }
});
```

---

**Last Updated**: February 1, 2026  
**Version**: 1.0.0  
**Author**: Coupon Analytics Team
