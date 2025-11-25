# ⚡ TaskFlow Lite - Quick Start Guide

## 🎉 Your App is Live!

**Access it now:** https://3000-ilm22kqegiuez2npg5xf9-a402f90a.sandbox.novita.ai

---

## ✅ 5-Minute Setup

### 1️⃣ Open the App (0 min)
Click the link above to access your TaskFlow Lite app.

### 2️⃣ Create an Account (1 min)
1. Click **"Register"**
2. Enter your name, email, and password
3. Click **"Create Account"**

### 3️⃣ Add Your First Task (2 min)
1. Click **"New Task"** button
2. Fill in:
   - **Title:** "Complete project documentation"
   - **Priority:** High
   - **Due Date:** Tomorrow
3. Click **"Create Task"**

### 4️⃣ Explore Features (2 min)
- **Dashboard** - View your productivity stats
- **Tasks** - Manage all your tasks
- **Focus Mode** - Start a Pomodoro timer
- **Settings** - Configure preferences

### 5️⃣ Install as PWA (Optional)
**Desktop:**
- Click the install icon in address bar
- Click "Install"

**Mobile:**
- Safari: Share → Add to Home Screen
- Chrome: Menu → Add to Home screen

---

## 🔧 Enable Google Calendar (Optional)

### Quick Setup (5 minutes)

1. **Get Google OAuth Credentials**
   - Go to: https://console.cloud.google.com/
   - Enable Google Calendar API & Gmail API
   - Create OAuth Client ID
   - Copy your Client ID

2. **Update App Configuration**
   ```bash
   cd /home/user/webapp
   # Edit public/static/app.js line 13
   # Replace 'YOUR_GOOGLE_CLIENT_ID' with your actual Client ID
   ```

3. **Rebuild**
   ```bash
   npm run build
   pm2 restart taskflow-lite
   ```

4. **Connect in App**
   - Go to Settings
   - Click "Connect Google Calendar"
   - Authorize the app

**Full Guide:** See `GOOGLE_OAUTH_SETUP.md` for detailed instructions.

---

## 📱 Features You Can Try Right Now

### ✅ Available Without Setup

- ✅ **Task Management** - Create, edit, delete, complete tasks
- ✅ **Priority Levels** - Low, Medium, High
- ✅ **Task Status** - Upcoming, In Progress, Completed, Overdue
- ✅ **Categories** - Organize tasks by category
- ✅ **Dashboard** - View stats and productivity metrics
- ✅ **Focus Mode** - Pomodoro timer (25/15/5 min sessions)
- ✅ **Filters** - Filter by status (all, upcoming, completed, etc.)
- ✅ **Search** - Find tasks quickly
- ✅ **Offline Mode** - Works without internet (PWA)
- ✅ **Browser Notifications** - Get notified about overdue tasks

### ⚠️ Requires Google OAuth Setup

- ⏳ **Google Calendar Sync** - Auto-create calendar events
- ⏳ **Gmail Reminders** - Send email for overdue tasks
- ⏳ **Bidirectional Sync** - Calendar changes update tasks

### ⚠️ Requires WhatsApp Number

- ⏳ **WhatsApp Alerts** - Get overdue notifications on WhatsApp
  - Go to Settings
  - Enter your WhatsApp number (with country code)
  - Enable WhatsApp reminders

---

## 🎯 Common Tasks

### Create a Task
1. Click **"New Task"** (or press `N`)
2. Fill in details
3. Click **"Create Task"**

### Complete a Task
1. Find the task in your list
2. Click **"Complete"** button
3. Task moves to Completed status

### Start Focus Session
1. Go to **"Focus Mode"**
2. (Optional) Select a task to work on
3. Click **"Start"**
4. Work for 25 minutes
5. Take a 5-minute break

### View Dashboard
1. Click **"Dashboard"** in navigation
2. See your stats:
   - Today's tasks
   - In Progress count
   - Overdue tasks
   - Total active tasks

### Filter Tasks
1. Go to **"Tasks"** page
2. Click filter buttons:
   - All
   - Upcoming
   - In Progress
   - Completed
   - Overdue

---

## 🚀 Quick Commands (For Developers)

### Development
```bash
# Start development server
cd /home/user/webapp
npm run build
pm2 start ecosystem.config.cjs

# Check status
pm2 status

# View logs
pm2 logs taskflow-lite --nostream

# Restart app
pm2 restart taskflow-lite
```

### Database
```bash
# Query database
npm run db:console:local
# Then: SELECT * FROM tasks;

# Reset database
rm -rf .wrangler/state/v3/d1
npm run db:migrate:local
```

### Testing
```bash
# Test API
curl http://localhost:3000/api/tasks/[USER_ID]

# Test frontend
open http://localhost:3000
```

---

## 🐛 Troubleshooting

### App Not Loading?
```bash
# Check if server is running
pm2 status

# Restart server
pm2 restart taskflow-lite

# Check logs for errors
pm2 logs taskflow-lite --nostream
```

### Port Already in Use?
```bash
# Kill process on port 3000
fuser -k 3000/tcp

# Restart
pm2 restart taskflow-lite
```

### Database Issues?
```bash
# Reset local database
rm -rf .wrangler/state/v3/d1
npm run db:migrate:local
```

### Build Errors?
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **README.md** | Complete documentation |
| **DEPLOYMENT.md** | Deployment guide |
| **GOOGLE_OAUTH_SETUP.md** | OAuth integration |
| **PROJECT_STRUCTURE.md** | Code architecture |
| **QUICK_START.md** | This file |

---

## ✨ Tips & Tricks

### Productivity Tips
1. **Use Priorities** - Mark urgent tasks as High priority
2. **Set Due Dates** - Tasks with deadlines get calendar events
3. **Use Categories** - Organize tasks (Work, Personal, Shopping, etc.)
4. **Focus Mode** - Use Pomodoro technique for deep work
5. **Check Dashboard Daily** - Review your productivity stats

### Power User Features
1. **Keyboard Shortcuts** (Coming soon)
2. **Drag & Drop** - Reorder tasks (Coming soon)
3. **Bulk Actions** - Select multiple tasks (Coming soon)
4. **Templates** - Save task templates (Coming soon)

### PWA Benefits
1. **Offline Access** - Use app without internet
2. **Install on Desktop** - Works like native app
3. **Mobile Home Screen** - Quick access from phone
4. **Background Sync** - Updates when back online
5. **Push Notifications** - Get alerts even when closed

---

## 🎨 Customization

### Change WhatsApp Number
1. Settings → WhatsApp section
2. Enter number with country code (+1234567890)
3. Click "Save Settings"

### Enable/Disable Notifications
1. Settings → Notifications section
2. Toggle switches:
   - Browser Notifications
   - Email Reminders
   - WhatsApp Reminders
3. Click "Save Settings"

### Theme (Coming Soon)
- Light mode (default)
- Dark mode (planned)

---

## 📊 Your Data

### What's Stored
- **LocalStorage:** User session, preferences
- **D1 Database:** Users, tasks, settings
- **Google:** Calendar events (if connected)

### Data Privacy
- All data stored in your personal D1 database
- Google tokens stored in browser (not server)
- No third-party analytics
- No data sharing

### Backup Your Data
```bash
# Export database (local)
cd /home/user/webapp
npm run db:console:local
# Then: .backup backup.db
```

---

## 🚀 Next Steps

### Immediate (Next 5 minutes)
- [ ] Create 3-5 tasks with different priorities
- [ ] Set due dates for upcoming tasks
- [ ] Try the Focus Mode with Pomodoro timer
- [ ] Install as PWA on your device

### Short Term (Next day)
- [ ] Setup Google OAuth for calendar sync
- [ ] Add WhatsApp number for notifications
- [ ] Organize tasks with categories
- [ ] Complete a focus session

### Long Term (This week)
- [ ] Deploy to Cloudflare Pages for production
- [ ] Connect with your actual Google Calendar
- [ ] Build your task management workflow
- [ ] Track your productivity stats

---

## 💡 Need Help?

### Resources
1. **Main Documentation:** See `README.md`
2. **API Testing:** Test endpoints with curl or Postman
3. **Logs:** Check `pm2 logs taskflow-lite`
4. **Browser Console:** Press F12 to see frontend logs

### Common Questions

**Q: How do I add tasks?**
A: Click "New Task" button in Tasks page.

**Q: How do I sync with Google Calendar?**
A: See `GOOGLE_OAUTH_SETUP.md` for full guide.

**Q: Can I use it offline?**
A: Yes! Install as PWA for full offline support.

**Q: Where is my data stored?**
A: In Cloudflare D1 database (SQLite).

**Q: Is it free?**
A: Yes, Cloudflare free tier includes everything you need.

---

## 🎉 You're Ready!

Your TaskFlow Lite app is **fully functional** and ready to use!

**Current URL:** https://3000-ilm22kqegiuez2npg5xf9-a402f90a.sandbox.novita.ai

### What's Working Right Now
✅ Authentication
✅ Task Management
✅ Dashboard & Stats
✅ Focus Mode
✅ Settings
✅ PWA (offline support)
✅ Background scheduler
✅ Browser notifications

### Start Using It
1. Open the URL
2. Register/Login
3. Add your first task
4. Start being productive!

---

**Built with ❤️ for productive developers**

🚀 Happy task managing!
