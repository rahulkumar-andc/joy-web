# Audit Monitoring & Analytics - Complete Documentation

## Overview
Complete real-time audit monitoring and analytics system with suspicious activity detection and alerting.

---

## Features

### 1. Real-time Audit Log Dashboard (WebSocket)

**WebSocket Endpoint:** `ws://localhost:5000/ws/audit-logs`

#### Client Connection
```javascript
const ws = new WebSocket('ws://localhost:5000/ws/audit-logs');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'INITIAL_LOGS') {
        // Received last 50 logs on connection
        console.log('Recent logs:', data.logs);
    }
    
    if (data.type === 'NEW_LOGS') {
        // Real-time new logs
        console.log('New logs arrived:', data.logs);
    }
};
```

#### Features
- ✅ Real-time log streaming (polls every 2 seconds)
- ✅ Sends last 50 logs on connection
- ✅ Broadcasts new logs to all connected clients
- ✅ Auto-reconnection handling

---

### 2. Audit Analytics API

#### Get Analytics

```http
GET /api/audit/analytics?startDate=2026-01-01&endDate=2026-02-01
Authorization: Required (admin/manager)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalActions": 1523,
    "actionsByType": {
      "LOGIN_SUCCESS": 450,
      "CREATE_PRODUCT": 23,
      "UPDATE_ORDER_STATUS": 156
    },
    "actionsByUser": [
      { "userId": 1, "count": 234 },
      { "userId": 5, "count": 189 }
    ],
    "actionsByEntity": {
      "PRODUCT": 456,
      "ORDER": 678,
      "USER": 234
    },
    "timeline": [
      { "date": "2026-01-15", "count": 45 },
      { "date": "2026-01-16", "count": 52 }
    ],
    "topUsers": [
      { "userId": 1, "actionCount": 234 }
    ]
  }
}
```

#### Get User Activity

```http
GET /api/audit/user/:userId?days=30
Authorization: Required (admin/manager)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalActions": 156,
    "recentActions": [
      {
        "action": "UPDATE_PRODUCT",
        "entityType": "PRODUCT",
        "timestamp": "2026-02-01T10:30:00Z"
      }
    ],
    "actionBreakdown": {
      "UPDATE_PRODUCT": 45,
      "CREATE_PRODUCT": 23
    }
  }
}
```

#### Export to CSV

```http
GET /api/audit/export?startDate=2026-01-01&endDate=2026-02-01
Authorization: Required (admin)
```

Downloads CSV file with all audit logs in the date range.

---

### 3. Suspicious Activity Detection

#### Detect Patterns

```http
GET /api/audit/suspicious-activity?hours=24
Authorization: Required (admin)
```

**Detects 4 Patterns:**
1. **EXCESSIVE_FAILED_LOGINS** (≥5 attempts)
2. **EXCESSIVE_DATA_ACCESS** (≥100 accesses)
3. **BULK_DELETE_OPERATIONS** (≥10 deletes)
4. **PERMISSION_ESCALATION_ATTEMPTS** (≥5 permission changes)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": 42,
      "pattern": "EXCESSIVE_FAILED_LOGINS",
      "severity": "critical",
      "count": 12,
      "details": { "failedAttempts": 12 }
    }
  ],
  "count": 1
}
```

#### Trigger Manual Scan

```http
POST /api/audit/monitor
Authorization: Required (admin)
```

Manually triggers suspicious activity scan and sends alerts.

---

### 4. Automated Alerting

#### Slack Integration

Set environment variable:
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Alert Example:**
```
🚨 Suspicious Activity Detected

Pattern: EXCESSIVE_FAILED_LOGINS
Severity: CRITICAL
User: John Doe (john@example.com)
Count: 12
Details: { "failedAttempts": 12 }

Time: 2026-02-01T11:30:00Z

Recommended Action:
- Review user's recent activity
- Contact user if necessary
- Suspend account if critical
```

#### Email Alerts

Set environment variable:
```env
ADMIN_ALERT_EMAILS=admin1@example.com,admin2@example.com
```

Currently logs to console. Integrate with your email service in `suspiciousActivityAlertService.ts`.

---

### 5. Background Monitoring Job

**Runs automatically every hour**

The monitoring job:
- Scans for suspicious activity in the last hour
- Detects patterns based on thresholds
- Sends Slack/email alerts for critical issues
- Runs immediately on server startup

**Manual trigger:**
```bash
curl -X POST https://yourapp.com/api/audit/monitor \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Setup

### 1. Environment Variables

Add to `.env`:
```env
# Slack alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Email alerts
ADMIN_ALERT_EMAILS=admin1@example.com,admin2@example.com
```

### 2. Start Monitoring Job

The job starts automatically with the server. No additional configuration needed.

### 3. WebSocket Setup

The WebSocket server is automatically initialized with your Express server.

---

## Usage Examples

### Real-time Dashboard (Frontend)

```typescript
// components/AuditDashboard.tsx
import { useEffect, useState } from 'react';

export function AuditDashboard() {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:5000/ws/audit-logs');

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'INITIAL_LOGS') {
                setLogs(data.logs.reverse()); // Newest first
            }
            
            if (data.type === 'NEW_LOGS') {
                setLogs(prev => [...data.logs.reverse(), ...prev]);
            }
        };

        return () => ws.close();
    }, []);

    return (
        <div>
            <h2>Live Audit Logs</h2>
            {logs.map(log => (
                <div key={log.id}>
                    <strong>{log.action}</strong> - {log.entityType} - 
                    {new Date(log.createdAt).toLocaleString()}
                </div>
            ))}
        </div>
    );
}
```

### Analytics Dashboard

```typescript
// Fetch analytics
const response = await fetch('/api/audit/analytics?startDate=2026-01-01&endDate=2026-02-01');
const { data } = await response.json();

// Display charts
<Chart data={data.timeline} />
<PieChart data={data.actionsByType} />
```

### Alert Configuration

Thresholds can be customized:
```typescript
const alertService = new SuspiciousActivityAlertService({
    alertThresholds: {
        failedLogins: 3,      // Alert after 3 failed logins
        dataAccess: 50,       // Alert after 50 data accesses
        bulkDeletes: 5        // Alert after 5 deletes
    }
});
```

---

## API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/audit/analytics` | GET | Admin, Manager | Get audit analytics |
| `/api/audit/suspicious-activity` | GET | Admin | Detect patterns |
| `/api/audit/monitor` | POST | Admin | Trigger manual scan |
| `/api/audit/user/:userId` | GET | Admin, Manager | User activity |
| `/api/audit/export` | GET | Admin | Export CSV |
| `/api/audit/dashboard/stats` | GET | Admin, Manager | Dashboard stats |
| `/ws/audit-logs` | WebSocket | Any | Real-time logs |

---

## Monitoring Metrics

### Dashboard Statistics

```http
GET /api/audit/dashboard/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connectedClients": 3,
    "lastLogId": 45623,
    "isPolling": true
  }
}
```

---

## Production Best Practices

1. **Rate Limiting**: Add rate limiting to analytics endpoints
2. **Caching**: Cache analytics results for frequently accessed date ranges
3. **Archive**: Archive old audit logs to separate table after 90 days
4. **Indexes**: Add indexes on `createdAt` and `userId` for faster queries
5. **Alerts**: Configure alert thresholds based on your traffic patterns

---

## Troubleshooting

### WebSocket Not Connecting

Check:
- Server is running
- WebSocket path is correct (`/ws/audit-logs`)
- No firewall blocking WebSocket connections

### Alerts Not Sending

Check:
- `SLACK_WEBHOOK_URL` is set correctly
- Webhook URL is valid
- Run manual scan: `POST /api/audit/monitor`

### High Memory Usage

- Limit WebSocket connections
- Reduce polling frequency
- Add connection limits

---

## Performance

**Expected Load:**
- 1000 audit logs/hour: ~2KB/second WebSocket traffic
- 10 concurrent dashboard clients: Negligible server load
- Analytics queries: ~50-200ms for 30-day range

**Optimization:**
- WebSocket compression enabled
- Polling interval: 2 seconds (configurable)
- Analytics caching recommended for production

---

**Created:** 2026-02-01  
**Version:** 1.0.0
