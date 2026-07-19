# Complete Moderation Flow Test Guide

## ✅ IMPLEMENTATION CHECKLIST

### Backend (Server)
- [x] FlagReport model created (`server/models/FlagReport.js`)
- [x] Moderation routes created (`server/routes/moderationRoutes.js`)
- [x] Routes registered in server (`app.use('/api/moderation', moderationRoutes)`)
- [x] Public links endpoint (`GET /api/links/public`)
- [x] Banned keywords in SystemSettings model
- [x] Keyword validation on link creation
- [x] Audit log actions added (APPROVE_REPORT, REJECT_REPORT, BULK_MODERATION)

### Frontend (Client)
- [x] ReportLinkButton component (`src/components/links/ReportLinkButton.jsx`)
- [x] Moderation dashboard (`src/pages/Admin/Moderation.jsx`)
- [x] Browse community page (`src/pages/Dashboard/Browse.jsx`)
- [x] Report buttons on MyLinks page
- [x] Report button on public link previews
- [x] Moderation route added to admin router
- [x] Browse route added to user router
- [x] Navigation menu items added

---

## 🧪 COMPLETE USER FLOW TEST

### Step 1: User Creates a Link
1. Login as regular user
2. Go to Dashboard → My Links
3. Click "Create New Link"
4. Fill in:
   - Target URL: `https://example.com`
   - Title: `Test Link`
   - Custom slug: `test123`
5. Click "Create Link"
6. **Expected:** Link created successfully

### Step 2: User Views Community Links
1. Go to Dashboard → Browse Community
2. **Expected:** 
   - See "Your Links" section (purple) with your link
   - See "Community Links" section (blue) with other users' links
   - Your link has NO report button
   - Other users' links HAVE report buttons

### Step 3: User Reports a Link
1. In Browse Community, find another user's link
2. Click "Report" button
3. Select reason: "Spam or unwanted content"
4. Enter description: "This link is spam and should be removed"
5. Click "Submit Report"
6. **Expected:** 
   - Success toast: "Report submitted successfully"
   - Modal closes

### Step 4: Admin Reviews Report
1. Logout and login as admin
2. Go to Admin → Moderation Queue
3. **Expected:**
   - See statistics cards with report count
   - See the submitted report in "Pending" status
   - Report shows:
     - Link slug and URL
     - Reason: "Spam Or Unwanted Content"
     - Description you entered
     - Reporter email
     - Timestamp

### Step 5: Admin Takes Action (Individual)
1. Click "Review Report" on the report
2. Add review notes: "Verified as spam, blocking link"
3. Click "Block Link"
4. **Expected:**
   - Success toast: "Report approved"
   - Report status changes to "APPROVED"
   - Link status changes to "blocked"
   - Audit log created

### Step 6: Verify Link is Blocked
1. Try to visit the blocked link (as any user)
2. **Expected:** 
   - Link shows as blocked/expired
   - Cannot access destination

### Step 7: Test Bulk Actions
1. As admin, go to Moderation Queue
2. Select multiple reports (checkbox)
3. Click "Block Links" in bulk actions bar
4. **Expected:**
   - All selected links blocked
   - Reports marked as approved
   - Success message with count
   - Audit log created for bulk action

### Step 8: Test Banned Keywords
1. As admin, go to System Settings
2. Scroll to "Content Moderation"
3. Add banned keyword: "scam"
4. Enable "Auto-Flag Banned Keywords"
5. Click "Save Changes"
6. **Expected:** Settings saved

### Step 9: Create Link with Banned Keyword
1. Login as regular user
2. Create new link with title: "Get rich scam scheme"
3. Click "Create Link"
4. **Expected:**
   - Link created but status = blocked
   - Message: "Link created but blocked due to policy violation"
   - High-priority report auto-generated in admin queue

### Step 10: Admin Sees Auto-Flagged Content
1. Login as admin
2. Go to Moderation Queue
3. Filter by Priority: "High"
4. **Expected:**
   - See system-generated report
   - Description: "Link automatically flagged for containing banned keyword: 'scam'"
   - Reporter: "system@auto-moderation"
   - Link already blocked

### Step 11: Test Audit Logs
1. As admin, go to Audit Logs
2. **Expected:** See entries for:
   - APPROVE_REPORT (when you approved reports)
   - BULK_MODERATION (when you used bulk actions)
   - UPDATE_SETTINGS (when you added banned keywords)
   - Each log shows admin name, action details, timestamp

---

## 🔍 API ENDPOINTS TO VERIFY

### Moderation Endpoints
```bash
# Submit report (public/authenticated)
POST /api/moderation/report
Body: { linkId, reason, description }

# Get all reports (admin only)
GET /api/moderation/reports?status=PENDING&page=1&limit=20

# Get statistics (admin only)
GET /api/moderation/stats

# Review single report (admin only)
PATCH /api/moderation/reports/:id
Body: { status: "APPROVED", actionTaken: "BLOCKED", reviewNotes: "..." }

# Bulk action (admin only)
POST /api/moderation/reports/bulk
Body: { reportIds: [...], action: "BLOCK_LINKS", reviewNotes: "..." }
```

### Public Links Endpoint
```bash
# Get all active links for community browsing
GET /api/links/public
```

---

## 🎯 EXPECTED BEHAVIOR

### For Regular Users:
- ✅ Can browse all community links
- ✅ Can see their own links highlighted separately
- ✅ Can report OTHER users' links
- ✅ CANNOT report their own links
- ✅ Cannot access moderation queue
- ✅ Blocked links show as expired/inaccessible

### For Admins:
- ✅ Can see all reports with filtering
- ✅ Can review reports individually
- ✅ Can take actions: approve (no action), block link, delete link, reject report
- ✅ Can use bulk actions on multiple reports
- ✅ Can configure banned keywords
- ✅ All actions logged in audit logs
- ✅ See statistics of pending/high-priority reports

### System Automation:
- ✅ Links with banned keywords auto-blocked
- ✅ High-priority reports auto-generated
- ✅ System reports clearly marked
- ✅ Auto-escalation for threats (MALWARE, PHISHING, etc.)

---

## 🐛 TROUBLESHOOTING

### If reports don't appear in admin queue:
1. Check browser console for errors
2. Verify API call: Network tab → `/api/moderation/report`
3. Check server logs for errors
4. Verify MongoDB connection
5. Check if FlagReport model exists in DB

### If bulk actions fail:
1. Verify multiple reports are selected
2. Check admin authentication
3. Look for error toast message
4. Check server logs

### If banned keywords don't work:
1. Verify settings were saved (check DB)
2. Ensure `autoFlagBannedKeywords` is true
3. Try creating link with exact keyword match
4. Check server console for validation logs

---

## 📊 DATABASE COLLECTIONS TO CHECK

### FlagReports Collection
```javascript
{
  linkId: ObjectId,
  reportedBy: ObjectId (or null for anonymous),
  reporterEmail: String,
  reason: "SPAM" | "MALWARE" | etc.,
  description: String,
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED",
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  reviewedBy: ObjectId,
  reviewedAt: Date,
  actionTaken: "NONE" | "BLOCKED" | "DELETED",
  createdAt: Date
}
```

### SystemSettings Collection
```javascript
{
  _id: "system_settings",
  bannedKeywords: ["scam", "fraud", ...],
  autoFlagBannedKeywords: true,
  // ... other settings
}
```

### AuditLogs Collection
```javascript
{
  action: "APPROVE_REPORT" | "REJECT_REPORT" | "BULK_MODERATION",
  adminId: ObjectId,
  adminEmail: String,
  target: "flagreport",
  targetId: String,
  details: { action, reportCount, etc. },
  createdAt: Date
}
```

---

## ✨ SUCCESS CRITERIA

All of the following should work:
1. ✅ Users can browse ALL links in community
2. ✅ Users can report problematic links
3. ✅ Reports appear in admin moderation queue
4. ✅ Admins can review and take action
5. ✅ Blocked links are inaccessible
6. ✅ Bulk actions work on multiple reports
7. ✅ Banned keywords auto-block links
8. ✅ System reports auto-generated
9. ✅ All actions logged in audit logs
10. ✅ Statistics update in real-time

---

## 🚀 QUICK START COMMANDS

```bash
# Start backend
cd server
npm start

# Start frontend (different terminal)
cd ../
npm run dev

# Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:5050/api

# Test as regular user
# Email: user@example.com

# Test as admin
# Email: admin@example.com
```

---

**Status:** ✅ All features implemented and integrated
**Last Updated:** December 9, 2025
**Version:** 1.0 - Complete Moderation System
