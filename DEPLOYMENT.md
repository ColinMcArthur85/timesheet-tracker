# Deployment Guide: Vercel + Postgres

## Quick Deploy (5 minutes)

### Step 1: Push to GitHub

```bash
cd /Users/colinmcarthur/DevProjects/timesheet_tracker/nextjs-app
git init
git add .
git commit -m "Initial commit - Timesheet Tracker"
```

Create a new repo on GitHub, then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/timesheet-tracker.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `timesheet-tracker` repo
4. Vercel will auto-detect Next.js settings
5. Click **"Deploy"** (don't add env vars yet)

### Step 3: Add Vercel Postgres

1. Once deployed, go to your project dashboard
2. Click **"Storage"** tab
3. Click **"Create Database"**
4. Select **"Postgres"**
5. Choose a name (e.g., `timesheet-db`)
6. Select region closest to you
7. Click **"Create"**

✅ Vercel automatically adds all Postgres environment variables to your project!

### Step 4: Initialize Database

The database tables will be created automatically on the first request. To manually initialize:

1. In Vercel dashboard → Storage → Your Postgres database
2. Click **"Query"** tab
3. Paste the contents of `schema.sql`
4. Click **"Run Query"**

### Step 5: Add Slack Environment Variables

1. In Vercel project → **"Settings"** → **"Environment Variables"**
2. Add these three variables:

   **SLACK_BOT_TOKEN**
   ```
   xoxb-your-actual-token-here
   ```

   **SLACK_SIGNING_SECRET**
   ```
   your-actual-signing-secret
   ```

   **SLACK_PUNCH_CHANNEL**
   ```
   C12345678  (your actual channel ID)
   ```

3. Click **"Save"**
4. Go to **"Deployments"** tab
5. Click **"Redeploy"** on the latest deployment

### Step 6: Configure Slack Webhook

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your Slack app (or create one - see SLACK_SETUP.md)
3. Go to **"Event Subscriptions"**
4. Toggle **"Enable Events"** to ON
5. Set **Request URL** to:
   ```
   https://your-app-name.vercel.app/api/slack/events
   ```
   (Replace `your-app-name` with your actual Vercel URL)
6. Under **"Subscribe to bot events"**, add:
   - `message.channels`
7. Click **"Save Changes"**

### Step 7: Test It!

1. Open your Vercel app: `https://your-app-name.vercel.app`
2. In Slack, go to your `#colins_hours` channel
3. Type: `In`
4. Wait 5 seconds
5. Refresh your dashboard - you should see the punch!

---

## Troubleshooting

### "Database connection failed"
- Make sure Vercel Postgres is created and linked
- Check that environment variables are set
- Redeploy after adding env vars

### "Slack events not working"
- Verify your Request URL in Slack shows a ✅ green checkmark
- Check Vercel Function Logs for errors
- Ensure `SLACK_PUNCH_CHANNEL` matches your actual channel ID

### "Wrong times showing"
- All times are in PST (America/Vancouver)
- Check your Slack message timestamps

### How to view logs
1. Vercel dashboard → Your project
2. Click **"Logs"** tab
3. Filter by "Functions" to see API route logs

---

## Migrating Data from Python App

If you want to migrate your existing SQLite data:

1. Export from SQLite:
   ```bash
   cd /Users/colinmcarthur/DevProjects/timesheet_tracker
   sqlite3 timesheet.db "SELECT * FROM punch_events;" > punches.csv
   ```

2. Import to Postgres (in Vercel dashboard → Query tab):
   ```sql
   -- Adjust this based on your CSV format
   COPY punch_events(user_id, event_type, timestamp, slack_event_id, raw_message)
   FROM '/path/to/punches.csv'
   DELIMITER ','
   CSV HEADER;
   ```

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `SLACK_BOT_TOKEN` | Bot OAuth token from Slack | `xoxb-123...` |
| `SLACK_SIGNING_SECRET` | Signing secret from Slack | `abc123...` |
| `SLACK_PUNCH_CHANNEL` | Channel ID for punch messages | `C12345678` |
| `POSTGRES_URL` | Auto-set by Vercel | - |
| `POSTGRES_PRISMA_URL` | Auto-set by Vercel | - |

---

## Post-Deployment

### Custom Domain (Optional)
1. Vercel dashboard → Settings → Domains
2. Add your custom domain
3. Update Slack webhook URL to use custom domain

### Monitoring
- Vercel automatically provides analytics
- Check **"Analytics"** tab for usage stats
- **"Speed Insights"** for performance

### Scaling
- Vercel auto-scales based on traffic
- Free tier: 100GB bandwidth, 100 serverless function executions
- Upgrade if needed: [vercel.com/pricing](https://vercel.com/pricing)

---

## Success! 🎉

Your timesheet tracker is now live and will automatically:
- ✅ Detect "In" and "Out" messages in Slack
- ✅ Store punches in Postgres
- ✅ Auto-refresh the dashboard every 5 seconds
- ✅ Calculate pay period summaries
- ✅ Handle timezone conversions (PST)

Visit your app at: `https://your-app-name.vercel.app`
