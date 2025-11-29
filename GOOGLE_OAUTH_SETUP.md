# 🔐 Google OAuth Setup Guide for TaskFlow Lite

This guide will walk you through setting up Google Calendar and Gmail integration for TaskFlow Lite.

---

## 🎯 What You'll Get

After completing this setup:
- ✅ **Automatic Calendar Sync** - Tasks automatically create Google Calendar events
- ✅ **Gmail Integration** - Send email reminders for overdue tasks
- ✅ **Bidirectional Sync** - Changes in calendar reflect in app and vice versa

---

## 📋 Prerequisites

- Google Account
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- TaskFlow Lite application URL

---

## 🚀 Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click **"New Project"**
4. Enter project details:
   - **Project name:** `TaskFlow Lite`
   - **Location:** No organization
5. Click **"Create"**

### Step 2: Enable Required APIs

1. In the left sidebar, go to **"APIs & Services"** → **"Library"**
2. Search for and enable these APIs:
   
   **a) Google Calendar API**
   - Click on "Google Calendar API"
   - Click **"Enable"**
   
   **b) Gmail API**
   - Go back to Library
   - Search "Gmail API"
   - Click **"Enable"**

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you have a workspace)
3. Click **"Create"**

**Fill in the form:**

**App Information:**
- App name: `TaskFlow Lite`
- User support email: Your email
- App logo: (Optional) Upload your app icon

**App Domain:**
- Application home page: `https://your-domain.pages.dev` (or your current URL)
- Application privacy policy link: `https://your-domain.pages.dev/privacy` (optional)
- Application terms of service link: `https://your-domain.pages.dev/terms` (optional)

**Developer Contact:**
- Email addresses: Your email

4. Click **"Save and Continue"**

**Scopes:**
5. Click **"Add or Remove Scopes"**
6. Add these scopes:
   - `https://www.googleapis.com/auth/calendar` (View and edit events)
   - `https://www.googleapis.com/auth/gmail.compose` (Compose emails)
7. Click **"Update"**
8. Click **"Save and Continue"**

**Test Users (for development):**
9. Click **"Add Users"**
10. Add your email addresses for testing
11. Click **"Save and Continue"**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**

**Configure the OAuth client:**

**Name:** `TaskFlow Lite Web Client`

**Authorized JavaScript origins:**
Add these URLs (click "Add URI" for each):
```
http://localhost:4000
http://localhost:5173
https://3000-ilm22kqegiuez2npg5xf9-a402f90a.sandbox.novita.ai
https://your-domain.pages.dev
```

**Authorized redirect URIs:**
Add these URLs:
```
http://localhost:4000
http://localhost:5173
https://3000-ilm22kqegiuez2npg5xf9-a402f90a.sandbox.novita.ai
https://your-domain.pages.dev
```

4. Click **"Create"**

### Step 5: Copy Your Credentials

A popup will appear with your credentials:

```
Client ID: 1234567890-abc123xyz.apps.googleusercontent.com
Client secret: GOCSPX-abc123xyz (not needed for client-side)
```

**Important:** Copy the **Client ID** - you'll need it in the next step!

---

## 🔧 Configure TaskFlow Lite

### Option 1: Update JavaScript File Directly

1. Open the file: `/home/user/webapp/public/static/app.js`
2. Find line 13 (around the top of the file):
   ```javascript
   const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
   ```
3. Replace with your actual Client ID:
   ```javascript
   const GOOGLE_CLIENT_ID = '1234567890-abc123xyz.apps.googleusercontent.com';
   ```
4. Save the file

### Option 2: Using Command Line

Run this command (replace with your Client ID):
```bash
cd /home/user/webapp
sed -i 's/YOUR_GOOGLE_CLIENT_ID/1234567890-abc123xyz/g' public/static/app.js
```

### Rebuild and Restart

```bash
cd /home/user/webapp
npm run build
pm2 restart taskflow-lite
```

---

## ✅ Test the Integration

### 1. Open the App
Visit: https://3000-ilm22kqegiuez2npg5xf9-a402f90a.sandbox.novita.ai

### 2. Login or Register
Create an account or login

### 3. Connect Google Calendar
1. Go to **Settings** page
2. Click **"Connect Google Calendar"**
3. A Google OAuth popup will appear
4. Select your Google account
5. Click **"Allow"** to grant permissions

### 4. Create a Task with Due Date
1. Go to **Tasks** page
2. Click **"New Task"**
3. Fill in:
   - Title: "Test Google Calendar Sync"
   - Due Date: Select a future date/time
4. Click **"Create Task"**

### 5. Verify in Google Calendar
1. Open [Google Calendar](https://calendar.google.com/)
2. Look for your task event
3. It should appear with the task title and time!

### 6. Test Gmail Integration
1. Go to **Settings**
2. Enable **"Email Reminders"**
3. When a task becomes overdue:
   - Click the email notification
   - Gmail compose window opens with pre-filled message
   - Click send to send the reminder

---

## 🔄 How It Works

### Task Creation Flow
```
User creates task → App calls Google Calendar API → Event created
                                                     ↓
                                              Event ID saved in database
```

### Task Update Flow
```
User updates task → App calls Google Calendar API → Event updated
```

### Task Completion Flow
```
User completes task → App calls Google Calendar API → Event deleted
```

### Background Scheduler (Every 60 seconds)
```
Check overdue tasks → Update status in database → Trigger notifications
```

---

## 🐛 Troubleshooting

### Issue: OAuth popup doesn't open

**Solution:**
1. Check browser popup blocker
2. Verify Client ID is correct in `app.js`
3. Check browser console for errors (F12)

### Issue: "Access blocked: This app's request is invalid"

**Solution:**
1. Go back to Google Cloud Console
2. Check authorized JavaScript origins and redirect URIs
3. Make sure your current URL is listed
4. Wait a few minutes for changes to propagate

### Issue: "invalid_client" error

**Solution:**
1. Double-check the Client ID is copied correctly
2. No extra spaces or characters
3. Rebuild the app after making changes

### Issue: Calendar events not creating

**Solution:**
1. Check browser console for errors
2. Verify you granted Calendar permissions
3. Make sure due_date is set on the task
4. Check network tab to see API calls

### Issue: Token expired

**Solution:**
- The access token expires after 1 hour
- Click "Connect Google Calendar" again to refresh
- Token is stored in localStorage

---

## 🔐 Security Notes

### Client-Side OAuth
- Access tokens stored in browser localStorage
- Tokens are visible in browser DevTools
- **Not recommended for production with sensitive data**

### Production Recommendations
1. Move OAuth to server-side (Cloudflare Workers)
2. Store tokens in D1 database encrypted
3. Use refresh tokens for long-term access
4. Implement token rotation

### Current Implementation
- ✅ Good for: Personal use, demos, MVPs
- ⚠️ Not ideal for: Multi-tenant, enterprise, sensitive data

---

## 📝 API Scopes Explained

### `https://www.googleapis.com/auth/calendar`
**Allows:**
- Read calendar events
- Create calendar events
- Update calendar events
- Delete calendar events

**Use case:** Sync tasks with Google Calendar

### `https://www.googleapis.com/auth/gmail.compose`
**Allows:**
- Create draft emails
- Send emails on user's behalf

**Use case:** Send overdue task reminders via email

---

## 🎯 Testing Checklist

- [ ] OAuth popup opens successfully
- [ ] Can grant permissions without errors
- [ ] Task creates calendar event
- [ ] Event appears in Google Calendar
- [ ] Task update modifies calendar event
- [ ] Task completion deletes calendar event
- [ ] Gmail compose opens for overdue tasks
- [ ] Email contains task details

---

## 📚 Additional Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [Gmail API Documentation](https://developers.google.com/gmail/api/guides)
- [OAuth 2.0 for Client-side Apps](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)

---

## ✨ You're All Set!

Your TaskFlow Lite app now has full Google Calendar and Gmail integration!

**Next Steps:**
- Create tasks and watch them sync to your calendar
- Test email reminders for overdue tasks
- Install the PWA on your devices
- Deploy to Cloudflare Pages for production

**Need Help?** Check the main README.md or open an issue.

---

**Happy Task Managing! 🚀**
