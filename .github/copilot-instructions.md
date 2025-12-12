# AI Coding Assistant Instructions - Timesheet Tracker

## Project Overview

**Timesheet Tracker** is a Slack-integrated timesheet app built with **Next.js 14 (App Router), TypeScript, and Vercel Postgres**. Users punch "In"/"Out" via Slack messages; the app tracks sessions, calculates pay period summaries, and displays real-time dashboards.

### Key Architecture Patterns

1. **Slack Event Handler** → **Database** → **Punch Processor** → **Dashboard UI**
   - `app/api/slack/events/route.ts`: Receives raw Slack messages, validates signatures, creates/updates punch events
   - `lib/punch-processor.ts`: Pairs IN/OUT events into sessions, handles duplicates (5-min threshold) and orphaned punches
   - `app/page.tsx`: Server-rendered dashboard using current pay period data
   - Auto-refresh client component polls `/api/status` every 30 seconds to detect new punches

2. **Timezone Handling (Critical)**
   - All stored timestamps are **UTC** in the database (`timestamp TIMESTAMPTZ`)
   - **Vancouver timezone** (PST/PDT) is the single source of truth for business logic
   - Key functions: `toZonedTime()` (UTC→Vancouver), `fromZonedTime()` (Vancouver→UTC)
   - Pay period boundaries (1st-14th, 15th-end of month) are calculated using Vancouver date
   - **Example**: "2025-01-15" in Vancouver ≠ "2025-01-15" UTC; use `toZonedTime(date, 'America/Vancouver')` to get the correct business day

3. **Pay Period Calculation**
   - Split by month halves: **1st-14th** and **15th-end**
   - Potential hours: **8h/day for Tue-Sat** only (no Sun-Mon)
   - `calculatePayPeriodStats()` returns `{total_minutes, potential_minutes, difference_minutes}`
   - Sessions are organized by day using `organizeSessionsByDay()` for UI display

## Critical Files & Patterns

| File | Purpose | Key Pattern |
|------|---------|------------|
| `lib/db.ts` | All Vercel Postgres queries | Uses `@vercel/postgres` SQL template; always pass dates as `ISO strings` |
| `lib/punch-processor.ts` | IN/OUT pairing logic | Filters duplicate INs (5-min window), handles missing OUT as "Open session" |
| `lib/types.ts` | Shared TypeScript interfaces | `PunchEvent` (raw DB), `ProcessedSession` (paired), `DayData` (organized by date) |
| `lib/pay-period-utils.ts` | Pay period date math | Uses `date-fns` + `date-fns-tz`; returns UTC timestamps |
| `lib/time-utils.ts` | Formatting & parsing | `formatDuration()` for UI (mm:ss), `parseSlackTimestamp()` for slack ts |
| `app/api/slack/events/route.ts` | Slack webhook | Signature verification before processing; URL challenge before auth |
| `app/page.tsx` | Main dashboard | Server component with `force-dynamic` (no caching) |

## Development Workflows

### Run Development Server
```bash
cd nextjs-app && npm run dev
```
Navigate to `http://localhost:3000`. Dashboard auto-refreshes via client-side polling.

### Build & Test
```bash
npm run build      # Next.js build
npm run lint       # ESLint check
```

### Database Schema
- **Single table**: `punch_events` (id, user_id, event_type, timestamp, slack_event_id, raw_message, created_at)
- **Indexes**: On `timestamp` (DESC) and `user_id` for query performance
- Schema auto-initializes via `initDatabase()` on first run; or manually via `schema.sql` in Vercel dashboard

### Debugging Slack Integration
- Verify `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN` in `.env.local`
- Slack webhook URL: `https://<your-app>/api/slack/events`
- Check `/api/debug` endpoint or server logs for signature validation logs

## Common Tasks & Patterns

### Adding a New API Endpoint
- Use Next.js App Router pattern: `app/api/[feature]/route.ts`
- Import `{ sql }` from `@vercel/postgres` for DB queries
- Return `NextResponse.json()` or `.text()`
- Example: `app/api/status/route.ts` returns `{last_punch_id}`

### Modifying Punch Processing Logic
- Edit `lib/punch-processor.ts` → `processPunches()` function
- Always sort input punches by timestamp first
- Handle edge cases: duplicate INs, orphaned OUTs, trailing IN (open session)
- Return array of `ProcessedSession[]` with calculated `duration_minutes`

### Updating Pay Period Calculations
- Modify `lib/pay-period-utils.ts` for date boundaries
- Modify `lib/pay-period.ts` for stats aggregation
- **Always** use `toZonedTime()` + `fromZonedTime()` pair for date conversions
- Test with dates near month boundaries and pay period splits

### Styling Components
- Tailwind CSS 4 + PostCSS configured
- Client components use `'use client'` directive
- Example: `app/components/AutoRefresh.tsx` is client-side (uses `useEffect`, `useRouter`)

## Important Constraints & Trade-offs

1. **No Real-Time WebSocket**: Uses polling (30s interval) for simplicity. Reduces Vercel Postgres connections.
2. **Single User**: Hardcoded user_id flow; multi-user requires schema changes and auth layer.
3. **Duplicate Detection**: 5-minute threshold for same-user consecutive INs; adjust in `punch-processor.ts` if needed.
4. **Timezone Locked to Vancouver**: All business logic assumes PST/PDT. Change requires updating `TIMEZONE` constant and date boundary logic.

## Integration Points

- **Slack**: Expects messages "In"/"Out"; parses `event.text`, validates via HMAC-SHA256 signature
- **Vercel Postgres**: Expects `POSTGRES_URL_NON_POOLING` in environment; auto-initialized on first request
- **Vercel**: Deploy via GitHub integration; env vars managed in dashboard
- **date-fns**: Used for date arithmetic (addDays, startOfMonth, etc.); date-fns-tz for timezone conversions

## Environment Variables (Required)

```bash
SLACK_BOT_TOKEN=xoxb-...           # Slack app bot token
SLACK_SIGNING_SECRET=...           # Slack signing secret
SLACK_PUNCH_CHANNEL=C...           # Slack channel ID for punches
POSTGRES_URL_NON_POOLING=postgres://...  # Vercel Postgres (auto-set)
```

---

**Last Updated**: 2025-12-09 | **Framework**: Next.js 14 (App Router) | **DB**: Vercel Postgres
