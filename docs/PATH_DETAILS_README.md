# API Path Details - Complete Reference

## Overview
Comprehensive documentation of all API endpoints in the e-commerce platform.

**Base URL:** `http://localhost:5000`  
**API Version:** v1

---

## Table of Contents
- [Authentication](#authentication)
- [User & Profile](#user--profile)
- [Products](#products)
- [Categories](#categories)
- [Cart](#cart)
- [Orders](#orders)
- [Payments](#payments)
- [Coupons](#coupons)
- [Reviews](#reviews)
- [Wishlist](#wishlist)
- [Admin](#admin)
- [RBAC](#rbac-role-based-access-control)
- [Analytics](#analytics)
- [Audit & Monitoring](#audit--monitoring)
- [Compliance (GDPR)](#compliance-gdpr)
- [Delivery](#delivery)
- [Refunds](#refunds)
- [Reconciliation](#reconciliation)
- [Webhooks](#webhooks)
- [Health](#health)

---

## Authentication

### Register
```http
POST /api/auth/register
Content-Type: application/json

Body:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response: 201 Created
{
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com" }
}
```

### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

Body:
{
  "token": "verification-token-here"
}

Response: 200 OK
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

Body:
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "user": { "id": 1, "email": "john@example.com", "role": "user" }
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Required

Response: 200 OK
```

### Get Current User
```http
GET /api/auth/me
Authorization: Required

Response: 200 OK
{
  "user": { "id": 1, "email": "john@example.com" }
}
```

### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

Body:
{
  "email": "john@example.com"
}

Response: 200 OK
```

### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

Body:
{
  "token": "reset-token",
  "password": "NewSecurePass123!"
}

Response: 200 OK
```

---

## User & Profile

### Get Profile
```http
GET /api/user/profile
Authorization: Required

Response: 200 OK
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890"
}
```

### Update Profile
```http
PATCH /api/user/profile
Authorization: Required

Body:
{
  "name": "John Updated",
  "phone": "+1234567890"
}

Response: 200 OK
```

### Change Password
```http
POST /api/user/change-password
Authorization: Required

Body:
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}

Response: 200 OK
```

### Get Addresses
```http
GET /api/user/addresses
Authorization: Required

Response: 200 OK
[
  {
    "id": 1,
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
]
```

### Create Address
```http
POST /api/user/addresses
Authorization: Required

Body:
{
  "street": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001"
}

Response: 201 Created
```

### Delete Address
```http
DELETE /api/user/addresses/:id
Authorization: Required

Response: 200 OK
```

---

## Products

### Get All Products
```http
GET /api/products?page=1&limit=20&search=laptop&categoryId=5
Public

Query Params:
- page (optional): Page number
- limit (optional): Items per page
- search (optional): Search term
- categoryId (optional): Filter by category

Response: 200 OK
{
  "products": [...],
  "total": 150,
  "page": 1,
  "totalPages": 8
}
```

### Get Product by ID
```http
GET /api/products/:id
Public

Response: 200 OK
{
  "id": 1,
  "name": "Laptop",
  "price": 50000,
  "stock": 10,
  "description": "..."
}
```

### Create Product
```http
POST /api/products
Authorization: Admin, Manager, Seller

Body:
{
  "name": "New Product",
  "description": "Description",
  "price": 1999,
  "stock": 100,
  "categoryId": 5
}

Response: 201 Created
```

### Update Product
```http
PATCH /api/products/:id
Authorization: Admin, Manager, Seller

Body:
{
  "price": 1899,
  "stock": 95
}

Response: 200 OK
```

### Delete Product
```http
DELETE /api/products/:id
Authorization: Admin, Manager

Response: 200 OK
```

---

## Categories

### Get All Categories
```http
GET /api/categories
Public

Response: 200 OK
[
  { "id": 1, "name": "Electronics", "slug": "electronics" }
]
```

### Get Category by ID
```http
GET /api/categories/:id
Public

Response: 200 OK
```

### Create Category
```http
POST /api/categories
Authorization: Admin, Manager

Body:
{
  "name": "Sports",
  "slug": "sports",
  "description": "Sports equipment"
}

Response: 201 Created
```

### Update Category
```http
PATCH /api/categories/:id
Authorization: Admin, Manager

Response: 200 OK
```

### Delete Category
```http
DELETE /api/categories/:id
Authorization: Admin, Manager

Response: 200 OK
```

---

## Cart

### Get Cart
```http
GET /api/cart
Authorization: Required

Response: 200 OK
{
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 1999
    }
  ],
  "total": 3998
}
```

### Add to Cart
```http
POST /api/cart
Authorization: Required

Body:
{
  "productId": 1,
  "quantity": 2
}

Response: 201 Created
```

### Update Cart Item
```http
PATCH /api/cart/:itemId
Authorization: Required

Body:
{
  "quantity": 3
}

Response: 200 OK
```

### Remove from Cart
```http
DELETE /api/cart/:itemId
Authorization: Required

Response: 200 OK
```

### Clear Cart
```http
DELETE /api/cart
Authorization: Required

Response: 200 OK
```

---

## Orders

### Create Order
```http
POST /api/orders
Authorization: Required

Body:
{
  "addressId": 1,
  "paymentMethod": "card",
  "items": [
    { "productId": 1, "quantity": 2 }
  ]
}

Response: 201 Created
```

### Get My Orders
```http
GET /api/orders
Authorization: Required

Response: 200 OK
[
  {
    "id": 1,
    "status": "pending",
    "total": 3998,
    "createdAt": "2026-02-01"
  }
]
```

### Get Order by ID
```http
GET /api/orders/:id
Authorization: Required

Response: 200 OK
```

### Cancel Order
```http
POST /api/orders/:id/cancel
Authorization: Required

Response: 200 OK
```

### Update Order Status (Admin)
```http
PATCH /api/orders/:id/status
Authorization: Admin, Manager

Body:
{
  "status": "shipped"
}

Response: 200 OK
```

---

## Payments

### Create Payment Session
```http
POST /api/payments/create-session
Authorization: Required

Body:
{
  "orderId": 1
}

Response: 200 OK
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### Webhook (Stripe)
```http
POST /api/payments/webhook
Public (Stripe only)

Response: 200 OK
```

---

## Coupons

### Validate Coupon
```http
POST /api/coupons/validate
Public

Body:
{
  "code": "SAVE20",
  "userId": 1,
  "orderTotal": 5000
}

Response: 200 OK
{
  "valid": true,
  "discount": 1000,
  "finalAmount": 4000
}
```

### Create Coupon
```http
POST /api/coupons
Authorization: Admin, Manager

Body:
{
  "code": "SAVE20",
  "type": "percentage",
  "value": 20,
  "minOrderValue": 1000,
  "expiresAt": "2026-12-31"
}

Response: 201 Created
```

### List Coupons
```http
GET /api/coupons
Authorization: Admin, Manager

Response: 200 OK
```

### Delete Coupon
```http
DELETE /api/coupons/:id
Authorization: Admin, Manager

Response: 200 OK
```

---

## Reviews

### Get Product Reviews
```http
GET /api/reviews/product/:productId
Public

Response: 200 OK
```

### Create Review
```http
POST /api/reviews
Authorization: Required

Body:
{
  "productId": 1,
  "rating": 5,
  "comment": "Great product!"
}

Response: 201 Created
```

### Update Review
```http
PATCH /api/reviews/:id
Authorization: Required (own review)

Response: 200 OK
```

### Delete Review
```http
DELETE /api/reviews/:id
Authorization: Required (own review) or Admin

Response: 200 OK
```

---

## Wishlist

### Get Wishlist
```http
GET /api/wishlist
Authorization: Required

Response: 200 OK
```

### Add to Wishlist
```http
POST /api/wishlist
Authorization: Required

Body:
{
  "productId": 1
}

Response: 201 Created
```

### Remove from Wishlist
```http
DELETE /api/wishlist/:productId
Authorization: Required

Response: 200 OK
```

---

## Admin

### Get Dashboard Stats
```http
GET /api/admin/stats/orders
Authorization: Admin, Manager

Response: 200 OK
{
  "totalOrders": 1523,
  "totalRevenue": 5234567,
  "pendingOrders": 45
}
```

### Get Daily Sales
```http
GET /api/admin/stats/daily-sales?days=30
Authorization: Admin, Manager

Response: 200 OK
```

### Get Top Products
```http
GET /api/admin/stats/top-products?limit=10
Authorization: Admin, Manager

Response: 200 OK
```

### Get Revenue Analytics
```http
GET /api/admin/analytics/revenue?startDate=2026-01-01&endDate=2026-02-01
Authorization: Admin, Manager

Response: 200 OK
```

### Import Products (CSV)
```http
POST /api/admin/products/import
Authorization: Admin
Content-Type: multipart/form-data

Body: file (CSV)

Response: 200 OK
```

### Export Products (CSV)
```http
GET /api/admin/products/export
Authorization: Admin

Response: 200 OK (CSV file)
```

### Export Orders Report
```http
GET /api/admin/reports/orders/export?startDate=2026-01-01
Authorization: Admin, Manager

Response: 200 OK (CSV file)
```

### Get Customer Profile
```http
GET /api/admin/customers/:id
Authorization: Admin, Manager

Response: 200 OK
```

---

## RBAC (Role-Based Access Control)

### Get Users
```http
GET /api/rbac/users
Authorization: Admin, Manager

Response: 200 OK
```

### Assign Role to User
```http
POST /api/rbac/users/:userId/roles/:roleId
Authorization: Admin

Response: 200 OK
```

### Remove Role from User
```http
DELETE /api/rbac/users/:userId/roles/:roleId
Authorization: Admin

Response: 200 OK
```

### Get All Roles
```http
GET /api/rbac/roles
Authorization: Admin

Response: 200 OK
```

### Create Role
```http
POST /api/rbac/roles
Authorization: Admin

Body:
{
  "name": "CONTENT_MANAGER",
  "description": "Can manage content"
}

Response: 201 Created
```

### Assign Permission to Role
```http
POST /api/rbac/roles/:roleId/permissions/:permissionId
Authorization: Admin

Response: 200 OK
```

### Get Audit Logs
```http
GET /api/rbac/audit?userId=1&action=CREATE_PRODUCT
Authorization: Admin, Manager

Response: 200 OK
```

---

## Analytics

### Coupon Analytics
```http
GET /api/analytics/coupons/:couponId
Authorization: Admin, Manager

Response: 200 OK
{
  "totalUses": 234,
  "totalDiscount": 45678,
  "topUsers": [...]
}
```

### Conversion Analytics
```http
GET /api/analytics/conversion/funnel
Authorization: Admin, Manager

Response: 200 OK
{
  "cartAdds": 1000,
  "checkouts": 500,
  "completedOrders": 350
}
```

### A/B Test Results
```http
GET /api/analytics/ab-tests/:testId
Authorization: Admin, Manager

Response: 200 OK
```

---

## Audit & Monitoring

### Get Audit Analytics
```http
GET /api/audit/analytics?startDate=2026-01-01&endDate=2026-02-01
Authorization: Admin, Manager

Response: 200 OK
{
  "totalActions": 1523,
  "actionsByType": {...},
  "timeline": [...]
}
```

### Detect Suspicious Activity
```http
GET /api/audit/suspicious-activity?hours=24
Authorization: Admin

Response: 200 OK
[
  {
    "userId": 42,
    "pattern": "EXCESSIVE_FAILED_LOGINS",
    "severity": "critical",
    "count": 12
  }
]
```

### Trigger Monitoring Scan
```http
POST /api/audit/monitor
Authorization: Admin

Response: 200 OK
```

### Get User Activity
```http
GET /api/audit/user/:userId?days=30
Authorization: Admin, Manager

Response: 200 OK
```

### Export Audit Logs (CSV)
```http
GET /api/audit/export?startDate=2026-01-01
Authorization: Admin

Response: 200 OK (CSV file)
```

### Dashboard Stats
```http
GET /api/audit/dashboard/stats
Authorization: Admin, Manager

Response: 200 OK
{
  "connectedClients": 3,
  "lastLogId": 45623
}
```

### WebSocket - Real-time Audit Logs
```
ws://localhost:5000/ws/audit-logs
Authorization: Any authenticated user

Messages:
- INITIAL_LOGS: Last 50 logs on connection
- NEW_LOGS: Real-time new logs
```

---

## Compliance (GDPR)

### Request Data Deletion
```http
DELETE /api/compliance/gdpr/request-deletion
Authorization: Required

Response: 200 OK
```

### Get Deletion Status
```http
GET /api/compliance/gdpr/deletion-status
Authorization: Required

Response: 200 OK
{
  "status": "pending",
  "requestedAt": "2026-02-01"
}
```

### Request Data Export
```http
POST /api/compliance/gdpr/export-data
Authorization: Required

Response: 200 OK
```

### Get Data Retention Policy
```http
GET /api/compliance/data-retention/policy
Authorization: Admin

Response: 200 OK
```

---

## Delivery

### Estimate Delivery
```http
POST /api/delivery/estimate
Public

Body:
{
  "fromCity": "Mumbai",
  "toCity": "Delhi",
  "pincode": "110001",
  "weight": 2.5
}

Response: 200 OK
{
  "estimatedDays": 3,
  "estimatedCost": 150
}
```

### Get Delivery Options
```http
GET /api/delivery/options/:city/:pincode
Public

Response: 200 OK
[
  {
    "carrier": "Blue Dart",
    "estimatedDays": 2,
    "cost": 200
  }
]
```

---

## Refunds

### Create Refund Request
```http
POST /api/refunds
Authorization: Required

Body:
{
  "orderId": 1,
  "reason": "Product defective",
  "items": [
    { "orderItemId": 1, "quantity": 1 }
  ]
}

Response: 201 Created
```

### Get My Refunds
```http
GET /api/refunds
Authorization: Required

Response: 200 OK
```

### Get Refund by ID
```http
GET /api/refunds/:id
Authorization: Required

Response: 200 OK
```

### Update Refund Status (Admin)
```http
PATCH /api/admin/refunds/:id/status
Authorization: Admin, Manager

Body:
{
  "status": "approved"
}

Response: 200 OK
```

### Get All Refunds (Admin)
```http
GET /api/admin/refunds
Authorization: Admin, Manager

Response: 200 OK
```

---

## Reconciliation

### Trigger Reconciliation
```http
POST /api/admin/reconciliation/trigger
Authorization: Admin

Response: 200 OK
```

### Get Discrepancies
```http
GET /api/admin/reconciliation/discrepancies
Authorization: Admin

Response: 200 OK
[
  {
    "type": "missing_payment",
    "orderId": 123,
    "amount": 5000
  }
]
```

### Resolve Discrepancy
```http
POST /api/admin/reconciliation/:id/resolve
Authorization: Admin

Body:
{
  "resolution": "Payment manually verified"
}

Response: 200 OK
```

---

## Webhooks

### Get Failed Webhooks (DLQ)
```http
GET /api/admin/webhooks/dlq
Authorization: Admin

Response: 200 OK
```

### Replay Webhook
```http
POST /api/admin/webhooks/:id/replay
Authorization: Admin

Response: 200 OK
```

---

## Health

### Basic Health Check
```http
GET /health
Public

Response: 200 OK
{
  "status": "ok",
  "timestamp": "2026-02-01T11:45:00Z"
}
```

### Database Health
```http
GET /health/database
Public

Response: 200 OK
{
  "status": "healthy",
  "primary": true,
  "replica": true,
  "replicaLagMs": 150
}
```

---

## Common

### Get Homepage Data
```http
GET /api/homepage
Public

Response: 200 OK
{
  "featuredProducts": [...],
  "categories": [...],
  "banners": [...]
}
```

### Upload Image
```http
POST /api/upload
Authorization: Admin
Content-Type: multipart/form-data

Body: image file

Response: 200 OK
{
  "url": "https://imagekit.io/..."
}
```

---

## Notes

### Rate Limiting
- Auth endpoints: 5 requests/15 minutes
- Webhook endpoints: 100 requests/minute
- General: 100 requests/15 minutes

### Authentication
- Session-based (cookies)
- Some admin endpoints require specific roles

### Response Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

### Pagination
Most list endpoints support:
- `?page=1` - Page number
- `?limit=20` - Items per page

### Filters
- Date ranges: `?startDate=2026-01-01&endDate=2026-02-01`
- Search: `?search=laptop`
- Sorting: `?sortBy=price&order=asc`

---

**Total Endpoints:** 100+  
**Last Updated:** 2026-02-01  
**API Version:** 1.0.0
