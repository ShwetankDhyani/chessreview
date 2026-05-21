# Cloud review stats setup

## 1. Create Supabase project (free)

1. [supabase.com](https://supabase.com) → New project
2. **SQL Editor** → paste and run `schema.sql`

## 2. Vercel environment variables

| Variable | Where to find it |
|----------|------------------|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → `service_role` (secret) |
| `STATS_READ_KEY` | Pick any long password (you choose) |

Redeploy the site after adding them.

## 3. View stats

- **Public popup**: site footer → **Stats** (reviews, countries, daily chart)
- **Full dashboard**: `https://chessreview.org/stats` → enter `STATS_READ_KEY`
- **SQL**: example questions in `QUERIES.md`

## What gets stored (per completed review only)

- Players, username, plies, depth, duration
- Date/time (`reviewed_at`)
- Country / region / city from **Vercel IP geo** (no browser location popup)
- Timezone + language from the browser (no permission)

## Location note

Geo is as precise as Vercel provides from the visitor IP (usually country + city). It is not GPS.
