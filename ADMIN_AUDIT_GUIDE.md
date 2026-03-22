# 🔐 Security Audit Logging - Administrator Guide

**Last Updated:** March 22, 2026  
**Phase:** Phase 4 - Complete  
**Audience:** System Administrators & Security Personnel

---

## Table of Contents

1. [Overview](#overview)
2. [Accessing the Audit Panel](#accessing-the-audit-panel)
3. [Understanding Audit Logs](#understanding-audit-logs)
4. [Querying Audit Data](#querying-audit-data)
5. [Security Best Practices](#security-best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Audit Logging?

Audit logging is a security mechanism that automatically records all significant events and actions within the AI Academy Portal. This includes:

- **Authentication Events**: All login/logout attempts (successful and failed)
- **User Actions**: Profile updates, password changes
- **Data Changes**: Track enrollments, module completions, score updates
- **Security Events**: Rate limit violations, blocked actions
- **System Events**: Administrative actions, configuration changes

### Why Audit Logging?

Audit logs serve multiple purposes:

| Purpose | Benefit |
|---------|---------|
| **Compliance** | Meet regulatory requirements (GDPR, DataPASS) |
| **Security** | Detect and investigate suspicious activities |
| **Accountability** | Track who did what and when |
| **Troubleshooting** | Diagnose system issues and user problems |
| **Forensics** | Investigate security incidents |

### Stored Information

Each audit log entry records:

```json
{
  "id": "unique-identifier",
  "userId": "user-id",
  "action": "LOGIN",
  "status": "SUCCESS",
  "timestamp": "2026-03-22T19:00:33.264Z",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "resourceType": null,
  "resourceId": null,
  "details": "{...additional context...}"
}
```

---

## Accessing the Audit Panel

### Requirements

- **Must be** an ADMIN user (role = 'ADMIN')
- **Valid** authentication token (logged in)
- **Access** to the admin dashboard

### Steps

1. **Log in** to https://fouris-academy.onrender.com
   - Use admin credentials
   - Token stored in HttpOnly cookie

2. **Navigate** to admin audit panel
   - Direct URL: `https://fouris-academy.onrender.com/admin-audit.html`
   - Or: Use admin menu → Security → Audit Logs

3. **Page loads** with audit logs from last 30 days

---

## Understanding Audit Logs

### Log Fields Explained

| Field | Description | Example |
|-------|-------------|---------|
| **Timestamp** | When the event occurred (UTC) | 2026-03-22 19:00:33 |
| **User** | User email/name who performed action | john.doe@4js.com |
| **Action** | Type of event that occurred | LOGIN, LOGOUT, UPDATE_PROFILE |
| **Status** | Outcome of the action | SUCCESS, FAILED, BLOCKED |
| **IP Address** | Client's IP address (useful for tracking location) | 192.168.1.100 |
| **Details** | Additional context specific to action | {attempts: 1, ...} |

### Action Types

| Action | Description | When Recorded |
|--------|-------------|---------------|
| `LOGIN` | User logged in | After successful authentication |
| `LOGOUT` | User logged out | After clearing session |
| `UPDATE_PROFILE` | User updated profile info | After profile changes saved |
| `CHANGE_PASSWORD` | User changed password | After password updated |
| `ENROLL_COURSE` | User enrolled in track/module | After enrollment created |
| `COMPLETE_MODULE` | User completed a module | After module marked complete |

### Status Types

| Status | Meaning | Common Reason |
|--------|---------|---------------|
| `SUCCESS` | Action completed successfully | Normal operation |
| `FAILED` | Action failed to complete | Input validation error |
| `BLOCKED` | Action was blocked for security | Rate limit exceeded |

---

## Querying Audit Data

### Using the Admin Panel

The audit panel provides a user-friendly interface with filters:

**1. Days to Show** (1-365)
- Default: 30 days
- Shows events from X days ago to now

**2. Action Filter** (optional)
- Select specific action type (Login, Logout, etc.)
- Leave empty to show all actions

**3. Status Filter** (optional)
- Show only: SUCCESS, FAILED, or BLOCKED events
- Leave empty to show all statuses

**4. Limit Results** (10-1000)
- Maximum records to display
- Default: 100 (for performance)

**Example Queries:**

**Find all failed login attempts (last 7 days):**
- Days: 7
- Action: LOGIN
- Status: FAILED
- Click: Search

**Find all user activity for john.doe@4js.com (last 90 days):**
- Days: 90
- Status: SUCCESS
- Then in results, click on john.doe@4js.com

---

### Using the API Directly

For advanced queries or automation, use the REST API:

#### Get All Audit Logs

```bash
curl -H "Cookie: token=YOUR_JWT_TOKEN" \
  "https://fouris-academy.onrender.com/api/admin/audit-logs?days=30&limit=100"
```

**Query Parameters:**
- `days`: Number of days to look back (default: 30)
- `limit`: Max results (default: 100, max: 1000)
- `action`: Filter by action type (optional, e.g., "LOGIN")
- `status`: Filter by status (optional, e.g., "FAILED")
- `userId`: Filter by user ID (optional)

**Response:**
```json
{
  "count": 42,
  "days": 30,
  "filters": { "action": "LOGIN", "status": null },
  "logs": [
    {
      "id": "abc123",
      "userId": "user-id",
      "action": "LOGIN",
      "status": "SUCCESS",
      "createdAt": "2026-03-22T19:00:33.264Z",
      "ipAddress": "192.168.1.100",
      "user": {
        "email": "john.doe@4js.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "ADMIN"
      }
    }
  ]
}
```

#### Get User's Audit History

```bash
curl -H "Cookie: token=YOUR_JWT_TOKEN" \
  "https://fouris-academy.onrender.com/api/admin/audit-logs/user/USER_ID?limit=50"
```

#### Get Statistics

```bash
curl -H "Cookie: token=YOUR_JWT_TOKEN" \
  "https://fouris-academy.onrender.com/api/admin/audit-logs/statistics?days=30"
```

---

## Security Best Practices

### 1. Regular Monitoring

- **Daily**: Check failed login attempts
- **Weekly**: Review unusual IP addresses
- **Monthly**: Archive logs >90 days old

### 2. Investigate Suspicious Activity

**Look for:**
- Multiple failed login attempts from same IP
- Logins from unusual geographic locations
- Unusual access times
- Changes by non-expected users

### 3. Protect Access

- ✅ Only ADMIN users can access audit logs
- ✅ Audit logs stored in production database (PostgreSQL/Neon)
- ✅ Access requires valid JWT token
- ✅ All API calls are rate-limited and logged

**DO NOT:**
- ❌ Share admin credentials
- ❌ Expose JWT tokens
- ❌ Delete audit logs (keep for compliance)
- ❌ Modify audit log data

### 4. Data Retention

**Recommended Policy:**
- **Active Storage**: 90 days (queryable from panel)
- **Archive**: 1 year (backup to cold storage)
- **Legal Hold**: 7 years (if required by regulations)

**Archive Command** (when implemented):
```sql
-- Archive logs older than 90 days
SELECT * FROM "AuditLog" WHERE createdAt < NOW() - INTERVAL '90 days'
INTO OUTFILE 'audit-logs-archive-2026-03.json'
```

### 5. Alert on Critical Events

Monitor for these patterns:

| Pattern | Action |
|---------|--------|
| 10+ failed logins from same IP | Block IP / Alert admin |
| Login from new geographic location | Send security email |
| Multiple admin actions by non-admin | Immediate investigation |
| Rapid data deletion events | Audit trail review |

---

## Troubleshooting

### "Access Denied" Error

**Problem:** Getting 403 when accessing `/admin-audit.html`

**Solutions:**
1. Verify you're logged in as ADMIN user
2. Confirm your JWT token is valid
3. Check your browser cookies have the `token` cookie
4. Try logging out and back in

### Audit Logs Not Showing

**Problem:** Audit panel loads but shows no logs

**Solutions:**
1. Increase "Days to Show" (some activity may be older)
2. Remove filters and try searching all logs
3. Check browser console (F12) for JavaScript errors
4. Verify the AuditLog table exists in database:
   ```sql
   SELECT COUNT(*) FROM "AuditLog";
   ```

### Missing Login/Logout Events

**Problem:** Expecting to see a login but it's not in logs

**Possible Reasons:**
- User logged in before audit system was deployed (March 22, 2026)
- Log is stored but filtered out (check date range)
- User is still logged in (logout hasn't been recorded yet)

### Slow Audit Panel Performance

**Problem:** Panel takes >5 seconds to load

**Solutions:**
1. Reduce "Limit Results" from 1000 to 100
2. Reduce "Days to Show" (don't query 12 months at once)
3. Add filters (Action/Status) to narrow results
4. Check database performance (Neon stats)

---

## API Reference

### Endpoints

```
GET /api/admin/audit-logs
GET /api/admin/audit-logs/user/:userId
GET /api/admin/audit-logs/statistics
```

### Authentication

All endpoints require:
- **Cookie**: `token=VALID_JWT_TOKEN`
- **Role**: ADMIN
- **Method**: GET

### Error Responses

| Code | Error | Reason |
|------|-------|--------|
| 401 | Unauthorized | Not logged in or token expired |
| 403 | Forbidden | Not an ADMIN user |
| 500 | Server Error | Database query failed |

---

## Compliance & Regulations

### GDPR Compliance

- ✅ Users can request their audit log history
- ✅ Logs are encrypted in transit (HTTPS)
- ✅ Data retention policy in place (see above)
- ✅ Access is role-based and logged

To export user's data:
```bash
GET /api/admin/audit-logs/user/{userId}?limit=1000
```

### DataPASS Compliance

- ✅ All authentication events logged
- ✅ Failed access attempts recorded
- ✅ IP addresses tracked
- ✅ User-Agent stored for anomaly detection

---

## Quick Reference

### Common Admin Tasks

**Check failed login attempts (today):**
1. Days: 1
2. Action: LOGIN
3. Status: FAILED
4. Search

**Audit a specific user's activity (last month):**
1. Open audit panel
2. Find user in logs
3. Click on user email to see full history

**Monitor system security (daily):**
1. Check for FAILED logins
2. Review unique IP addresses
3. Look for BLOCKED status events

---

## Support

**For Issues:**
- Check logs in Render Dashboard: https://dashboard.render.com
- Review database in Neon Console: https://console.neon.tech
- Contact: [your-email@4js.com]

**Resources:**
- Security Audit: `SECURITY_AUDIT.md`
- Remediation Plan: `REMEDIATION_PLAN_FR.md`
- Phase 4 Details: This document

---

**Version:** 1.0  
**Last Updated:** 2026-03-22  
**Status:** ✅ PRODUCTION READY
