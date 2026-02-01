# Slack Webhook Setup Guide

## Overview
Configure Slack notifications for suspicious activity alerts in your audit monitoring system.

---

## Step 1: Create Slack Webhook

### 1.1 Go to Slack API
Visit: https://api.slack.com/apps

### 1.2 Create New App
- Click "Create New App"
- Select "From scratch"
- Name: "Audit Monitoring Alerts"
- Choose your workspace

### 1.3 Enable Incoming Webhooks
- Navigate to "Incoming Webhooks" in the sidebar
- Toggle "Activate Incoming Webhooks" to **ON**

### 1.4 Add Webhook to Channel
- Click "Add New Webhook to Workspace"
- Select channel (recommended: #security-alerts or #admin-alerts)
- Click "Allow"

### 1.5 Copy Webhook URL
Copy the webhook URL - it looks like:
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

---

## Step 2: Configure Environment Variable

Add to your `.env` file:
```env
# Slack Webhook for Suspicious Activity Alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Admin Email Alerts (comma-separated)
ADMIN_ALERT_EMAILS=admin1@example.com,admin2@example.com,security@example.com
```

---

## Step 3: Test Alert

### Manual Test
```bash
curl -X POST http://localhost:5000/api/audit/monitor \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Create Test Pattern
```bash
# Trigger 10 failed logins (will trigger alert)
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpassword"}'
done

# Wait for hourly job or trigger manually
curl -X POST http://localhost:5000/api/audit/monitor \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Step 4: Customize Alert Channel

### Recommended Channels
- **#security-alerts** - For all suspicious activity
- **#admin-alerts** - For admin notification
-  **#critical-alerts** - For critical severity only

### Multiple Channels
To send alerts to multiple channels, create separate webhooks:
```env
# Primary alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/PRIMARY_WEBHOOK

Alternative: Modify code to support multiple webhooks
```

---

## Alert Examples

### Failed Login Alert
```
🚨 Suspicious Activity Detected

EXCESSIVE_FAILED_LOGINS - CRITICAL
User: John Doe (john@example.com)
Count: 12
Details: { "failedAttempts": 12 }

Time: 2026-02-01T11:30:00Z

Recommended Action:
- Review user's recent activity
- Contact user if necessary
- Suspend account if critical
```

### Data Access Alert
```
🚨 Suspicious Activity Detected

EXCESSIVE_DATA_ACCESS - MEDIUM
User: Jane Smith (jane@example.com)
Count: 150
Details: { "accessCount": 150 }

Time: 2026-02-01T11:30:00Z
```

---

## Severity Colors

Alerts are color-coded by severity:
- 🟢 **Low** - Green (#36a64f)
- 🟠 **Medium** - Orange (#ff9900)
- 🔴 **High** - Red (#ff0000)
- 🔴🔴 **Critical** - Dark Red (#8b0000)

---

## Troubleshooting

### Alert Not Appearing

**Check webhook URL:**
```bash
# Test webhook directly
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test alert"}'
```

**Check logs:**
```bash
# Server logs will show if Slack API fails
tail -f logs/app.log | grep "Slack"
```

### Invalid Webhook Error

- Verify webhook URL is correct
- Ensure webhook hasn't been revoked
- Check workspace permissions

### No Alerts Despite Activity

- Verify patterns are being detected: `GET /api/audit/suspicious-activity`
- Check alert thresholds in `server/config/alert-config.ts`
- Ensure monitoring job is running (hourly)

---

## Production Best Practices

### 1. Use Dedicated Channel
Create a dedicated #security-alerts channel with:
- Limited members (security team + admins)
- Notification settings tuned
- Retention policy for compliance

### 2. Alert Throttling
Consider implementing throttling to avoid alert fatigue:
```typescript
// In suspiciousActivityAlertService.ts
private lastAlertTime: Map<string, number> = new Map();

// Throttle: Max 1 alert per pattern per hour
const key = `${pattern.pattern}-${pattern.userId}`;
const lastAlert = this.lastAlertTime.get(key) || 0;
if (Date.now() - lastAlert < 3600000) {
  return; // Skip alert
}
this.lastAlertTime.set(key, Date.now());
```

### 3. Escalation Rules
Configure different webhooks for different severity:
- Critical → #critical-alerts + PagerDuty
- High → #security-alerts
-  Medium/Low → #admin-logs

---

## Advanced: Slack App Customization

### Custom Bot Name & Icon
In Slack App settings:
- Navigate to "Basic Information"
- Under "Display Information":
  - **App Name**: "Security Monitor"
  - **Short Description**: "Suspicious activity alerts"
  - **App Icon**: Upload security icon
  - **Background Color**: Choose color (#FF0000 for security)

### Interactive Messages (Future)
For future enhancement, add action buttons:
- "Investigate"
- "Suspend User"
- "Mark as False Positive"

---

## Cost
Slack webhooks are **free** for all plans.

---

**Setup Complete!** You'll now receive real-time security alerts in Slack. 🚀
