# Coupon System Guide 🎟️

This guide explains how to create, manage, and use coupons in the system.

---

## 🚀 How to Generate (Create) a Coupon

Coupons are currently created manually via the **Admin API**. 

### 1. API Endpoint
**POST** `/api/coupons`
*Note: Requires Admin or Manager login.*

### 2. Payload (What to send)
```json
{
  "code": "SALE2024",           // The code user enters
  "discountType": "percentage", // "percentage" OR "fixed"
  "discountValue": "20",        // 20% off OR ₹20 off
  "minOrderAmount": "500",      // Minimum cart value required
  "maxUsage": 1000,             // Total times this coupon can be used (Global)
  "maxUsagePerUser": 1,         // How many times ONE person can use it
  "expiresAt": "2024-12-31T23:59:59Z" // Optional expiry date
}
```

### 3. Examples

#### Example A: 50% Off First Order (One-time use)
```json
{
  "code": "FIRST50",
  "discountType": "percentage",
  "discountValue": "50",
  "minOrderAmount": "0",
  "maxUsagePerUser": 1
}
```

#### Example B: Flat ₹500 Off on Orders above ₹2000
```json
{
  "code": "BIGSAVE500",
  "discountType": "fixed",
  "discountValue": "500",
  "minOrderAmount": "2000"
}
```

---

## 🗑️ How to Delete (Deactivate) a Coupon

If you want to stop a coupon from working:

### API Endpoint
**DELETE** `/api/coupons/:id`

*   **Logic:** This performs a **Soft Delete**. The coupon is marked as `inactive` in the database.
*   **Result:** Users can no longer apply it, but the analytics (how many times it was used) are preserved.

---

## 🛡️ Validation Rules (How it works)

When a user applies a coupon, the system checks:

1.  **Is it Active?** (Has it been deleted?)
2.  **Is it Expired?** (Is current date > `expiresAt`?)
3.  **Minimum Order?** (Is `Cart Total` >= `minOrderAmount`?)
4.  **Global Limit?** (Has total usage reached `maxUsage`?)
5.  **User Limit?** (Has this specific user used it > `maxUsagePerUser` times?)

---

## 💰 Calculation Logic

**Important:** Coupons apply to the **Final Offer Price**.

*   If a product is ₹1000 but on sale for ₹800.
*   The system uses **₹800** as the base.
*   If you have a **10% Coupon**, users get an extra ₹80 off.
*   **Final Price:** ₹720.

---

## 📊 Analytics

You can track coupon performance using the Analytics API:
*   `GET /api/admin/analytics/coupons/dashboard` - Overview
*   `GET /api/admin/analytics/coupons/:id/roi` - ROI Analysis

---

## 🛠️ Need Help?

*   **Database Table:** `coupons`
*   **Service Logic:** `server/services/couponService.ts`
*   **Controller:** `server/controllers/couponController.ts`
