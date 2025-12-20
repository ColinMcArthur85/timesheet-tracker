# Timesheet Tracker - Next.js Version

A Slack-integrated timesheet tracker built with Next.js, TypeScript, and Vercel Postgres.

## Features

- ✅ Automatic time tracking from Slack messages
- ✅ Real-time dashboard with auto-refresh
- ✅ Pay period summaries with detailed breakdowns
- ✅ PST timezone support
- ✅ Serverless deployment on Vercel

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Vercel Postgres
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `env.example` to `.env.local` and fill in your Slack credentials:
   ```bash
   cp env.example .env.local
   ```

3. **Set up Vercel Postgres** (for local development):
   ```bash
   npm i -g vercel
   vercel link
   vercel env pull .env.local
   ```

4. **Initialize the database**:
   The database tables will be created automatically on first run.

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open** [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js
   - Click "Deploy"

3. **Add Vercel Postgres**:
   - In your Vercel project dashboard, go to "Storage"
   - Click "Create Database" → "Postgres"
   - Click "Create" (free tier available)
   - Vercel will automatically add the environment variables

4. **Add Slack Environment Variables**:
   - In Vercel project settings → "Environment Variables"
   - Add:
     - `SLACK_BOT_TOKEN`
     - `SLACK_SIGNING_SECRET`
     - `SLACK_PUNCH_CHANNEL`

5. **Configure Slack Webhook**:
   - In your Slack App settings → "Event Subscriptions"
   - Set Request URL to: `https://your-app.vercel.app/api/slack/events`
   - Subscribe to `message.channels` event
   - Save changes

## Slack Setup

See the original `SLACK_SETUP.md` for detailed instructions on:
- Creating a Slack app
- Getting your channel ID
- Configuring bot permissions
- Setting up event subscriptions

## Usage

1. **In Slack**, go to your designated channel (e.g., `#colins_hours`)
2. **Type "In"** to punch in
3. **Type "Out"** to punch out
4. **Dashboard** auto-refreshes within 5 seconds to show new punches

## Database Schema

The app uses a simple schema with one main table:

```sql
CREATE TABLE punch_events (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('IN', 'OUT')),
  timestamp TIMESTAMPTZ NOT NULL,
  slack_event_id TEXT UNIQUE NOT NULL,
  raw_message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Project Structure

```
nextjs-app/
├── app/
│   ├── api/
│   │   ├── slack/events/route.ts  # Slack webhook handler
│   │   └── status/route.ts        # Polling endpoint
│   ├── components/
│   │   └── AutoRefresh.tsx        # Client-side auto-refresh
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Dashboard page
├── lib/
│   ├── db.ts                      # Database functions
│   ├── types.ts                   # TypeScript types
│   ├── punch-processor.ts         # Punch pairing logic
│   ├── pay-period.ts              # Pay period calculations
│   └── time-utils.ts              # Time/date utilities
└── schema.sql                     # Database schema
```

## License

MIT
