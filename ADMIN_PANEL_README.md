# 🔐 Admin Audit Panel - Quick Access Guide

## 📍 Access the Audit Panel

**URL:** https://fouris-academy.onrender.com/admin-audit.html

**Requirements:**
- Must be logged in as ADMIN user
- Valid JWT token in cookies

**Steps:**
1. Log in to https://fouris-academy.onrender.com with admin credentials
2. Navigate directly to: `/admin-audit.html`
3. Audit logs from last 30 days will load automatically

---

## 🎯 What You Can Do

### View Audit Logs
- See all login/logout events
- Filter by action type (LOGIN, LOGOUT, etc.)
- Filter by status (SUCCESS, FAILED, BLOCKED)
- Filter by date range (1-365 days)

### Investigate Security Events
- Find failed login attempts
- Check unusual IP addresses
- Review user activity history
- Track administrative actions

### Monitor System Health
- View real-time statistics
- Count events by action type
- Track failed vs successful logins
- Identify patterns

---

## 📚 Full Documentation

**Detailed Admin Guide:** [ADMIN_AUDIT_GUIDE.md](./ADMIN_AUDIT_GUIDE.md)

Topics covered:
- How audit logging works
- Understanding log fields
- API reference for automation
- Security best practices
- Compliance information
- Troubleshooting guide

---

## 🚀 Try It Now

1. **Log in** to the portal
2. **Visit** `/admin-audit.html`
3. **Click Search** to view recent events
4. **Filter** by action and status
5. **Click Details** to see full event information

---

## 🔍 Common Queries

### Find failed login attempts
```
Days: 1
Action: LOGIN
Status: FAILED
→ Search
```

### Check user activity
```
Days: 30
(leave filters empty)
→ Search
→ Click on user email to see history
```

### View statistics
- Panel shows automatic counts at top
- Top actions, total events, failed attempts

---

## 💡 Tips

- **Auto-refresh**: Panel refreshes every 1 minute
- **Export**: Use browser DevTools to export table data
- **API access**: Can also query via REST API with admin token

---

## 🚩 Important Files

| File | Purpose |
|------|---------|
| `app/admin-audit.html` | Admin audit panel (this page) |
| `ADMIN_AUDIT_GUIDE.md` | Detailed admin documentation |
| `SECURITY_HARDENING_COMPLETE.md` | Full summary of all security fixes |
| `server/routes/admin.js` | Backend API endpoints |
| `server/utils/auditLog.js` | Audit logging service |

---

## ❓ Need Help?

**Panel not loading?**
- Verify you're logged in as ADMIN
- Clear cookies and re-login
- Check browser console (F12) for errors

**No logs showing?**
- Try increasing "Days to Show"
- Remove filters to search all logs
- Verify database connection in Neon

**API not responding?**
- Check Render logs: https://dashboard.render.com
- Verify JWT_SECRET in environment variables
- Ensure you're making authenticated requests

---

**Version:** 1.0  
**Last Updated:** March 22, 2026  
**Status:** ✅ PRODUCTION
