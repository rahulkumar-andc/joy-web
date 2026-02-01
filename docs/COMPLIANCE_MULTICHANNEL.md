# Compliance & Multi-Channel Features - Documentation

## GDPR Compliance

### Data Deletion (Right to Erasure)

**Service:** `server/services/gdprDataDeletionService.ts`

**API Endpoint:**
```http
DELETE /api/compliance/user/:id
Authorization: Admin Required
Body: { "reason": "User requested deletion" }
```

**What Gets Deleted:**
- User account
- All orders and order items
- Reviews
- Addresses
- Cart and wishlist items
- Coupon usage records
- Wallet transactions
- Refunds
- Audit logs (anonymized, not deleted)

**Usage:**
```typescript
const result = await gdprDataDeletionService.deleteUserData(
    userId,
    adminId,
    "User requested account deletion"
);

console.log(result.deletedRecords);
// {
//   orders: 5,
//   reviews: 3,
//   addresses: 2,
//   user: true
// }
```

---

### Data Export (Right to Data Portability)

**API Endpoint:**
```http
GET /api/compliance/user/:id/export
Authorization: Required (Own Data or Admin)
```

Returns all user data in JSON format.

---

### Data Retention Policies

**Service:** `server/services/dataRetentionService.ts`

**Auto-Cleanup Rules:**
- Audit logs: 90 days retention
- Sessions: 30 days after expiry
- Stock reservations: 7 days after expiry

**API Endpoints:**
```http
# Run retention policies manually
POST /api/compliance/retention/run
Authorization: Admin Required

# Get retention statistics
GET /api/compliance/retention/stats
Authorization: Admin Required
```

**Automated Cleanup:**
Schedule this in cron or process scheduler:
```typescript
import { dataRetentionService } from './services/dataRetentionService';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
    await dataRetentionService.runRetentionPolicies();
});
```

---

### Security Audit Logging

**Service:** `server/services/securityAuditService.ts`

**Logged Events:**
- Login attempts (success/failure)
- Logout
- Password changes
- Account lockouts
- Admin access to sensitive endpoints
- Permission changes
- Data access
- Suspicious activity

**Usage:**
```typescript
import { SecurityAuditService } from './services/securityAuditService';

// Log login attempt
await SecurityAuditService.logLoginAttempt({
    email: 'user@example.com',
    success: true,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
}, userId);

// Log admin access
await SecurityAuditService.logAdminAccess({
    userId: adminId,
    action: 'DELETE_USER',
    resource: 'USER',
    resourceId: deletedUserId,
    ipAddress: req.ip
});
```

---

## Multi-Channel Features

### Multi-Currency Support

**Service:** `server/services/multiCurrencyService.ts`

**Supported Currencies:**
- INR (₹) - Base currency
- USD ($)
- EUR (€)
- GBP (£)
- AED (د.إ)
- SAR (ر.س)

**API Usage:**
```typescript
import { multiCurrencyService } from './services/multiCurrencyService';

// Convert price
const converted = multiCurrencyService.convertProductPrice('1000', 'USD');
console.log(converted);
// {
//   original: 1000,
//   converted: 12,
//   currency: 'USD',
//   formatted: '$12.00'
// }

// Get all currencies
const currencies = multiCurrencyService.getSupportedCurrencies();

// Format amount
const formatted = multiCurrencyService.formatAmount(100, 'EUR');
// "€100.00"
```

**Frontend Integration:**
```typescript
// Store selected currency in session/localStorage
localStorage.setItem('currency', 'USD');

// Convert all product prices on display
products.map(product => {
    const converted = multiCurrencyService.convertProductPrice(
        product.price,
        selectedCurrency
    );
    return { ...product, displayPrice: converted.formatted };
});
```

---

### SMS Notifications

**Service:** `server/services/smsNotificationService.ts`

**Supported Providers:**
- Twilio
- AWS SNS

**Setup:**
Add to `.env`:
```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Usage:**
```typescript
import { smsNotificationService } from './services/smsNotificationService';

// Send order confirmation
await smsNotificationService.sendOrderConfirmation(
    '+919876543210',
    orderId,
    '₹1299.00'
);

// Send OTP
await smsNotificationService.sendOTP('+919876543210', '123456');

// Custom SMS
await smsNotificationService.sendSMS({
    phone: '+919876543210',
    message: 'Your order has been delivered!'
});
```

---

### Push Notifications

**Service:** `server/services/pushNotificationService.ts`

**Provider:** Firebase Cloud Messaging (FCM)

**Setup:**
1. Create Firebase project
2. Get Server Key from Firebase Console
3. Add to `.env`:
```env
FCM_SERVER_KEY=your_fcm_server_key
```

**Usage:**
```typescript
import { pushNotificationService } from './services/pushNotificationService';

// Send to single device
await pushNotificationService.sendToDevice(deviceToken, {
    title: 'Order Update',
    body: 'Your order has been shipped!',
    data: { orderId: '123', type: 'order_update' }
});

// Send order update
await pushNotificationService.sendOrderUpdate(
    deviceToken,
    orderId,
    'shipped'
);

// Send promotion
await pushNotificationService.sendPromotion(
    deviceToken,
    '50% Off Sale!',
    'Limited time offer on all products',
    'https://store.com/sale'
);
```

**Device Token Storage:**
Add `device_tokens` table to schema (optional):
```sql
CREATE TABLE device_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token TEXT NOT NULL,
    platform TEXT, -- 'ios' or 'android'
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Production Checklist

### GDPR Compliance
- ✅ Data deletion API implemented
- ✅ Data export API implemented
- ✅ Retention policies automated
- ✅ Security audit logging active
- ⚠️ Schedule daily retention job (cron)

### Multi-Currency
- ✅ 6 currencies supported
- ✅ Conversion service ready
- ⚠️ Update exchange rates periodically (integrate with API)
- ⚠️ Add currency selector to frontend

### SMS
- ✅ Service created
- ⚠️ Add Twilio/SNS credentials to production `.env`
- ⚠️ Test SMS delivery

### Push Notifications
- ✅ Service created
- ⚠️ Add FCM server key to production `.env`
- ⚠️ Setup device token storage
- ⚠️ Implement token registration endpoint
