#!/bin/bash

echo "🚀 Timesheet Tracker - Quick Deploy to Vercel"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the nextjs-app directory"
    echo "   cd /Users/colinmcarthur/DevProjects/timesheet_tracker/nextjs-app"
    exit 1
fi

echo "📦 Step 1: Installing dependencies..."
npm install

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Push to GitHub:"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit - Timesheet Tracker'"
echo "   # Create a new repo on GitHub, then:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/timesheet-tracker.git"
echo "   git push -u origin main"
echo ""
echo "2. Deploy to Vercel:"
echo "   - Go to https://vercel.com/new"
echo "   - Import your GitHub repository"
echo "   - Click 'Deploy'"
echo ""
echo "3. Add Vercel Postgres:"
echo "   - In Vercel dashboard → Storage → Create Database → Postgres"
echo ""
echo "4. Add Environment Variables:"
echo "   - Settings → Environment Variables"
echo "   - Add: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_PUNCH_CHANNEL"
echo ""
echo "5. Configure Slack webhook:"
echo "   - Update Request URL to: https://your-app.vercel.app/api/slack/events"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT.md"
echo ""
