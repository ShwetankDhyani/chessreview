# Review analytics setup

Stores **metadata only** when a review finishes (players, ratings, country, depth, duration). No PGN.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql`.
   - If production SQL is read-only on free tier, use **Table Editor** to create `review_events` with the columns from the schema, then run only the two `create function` blocks.
3. Copy **Settings → API**:
   - Project URL → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Vercel environment variables

| Variable | Where |
|----------|--------|
| `SUPABASE_URL` | Vercel → Project → Settings → Environment Variables |
| `SUPABASE_SERVICE_ROLE_KEY` | Same (server-only, never `VITE_`) |
| `ADMIN_SECRET` | Same — your password for `/admin` |

Redeploy after adding vars.

## 3. URLs

| URL | Who |
|-----|-----|
| Site footer | Public — “reviews served” counter + country popup |
| `/admin` | You — full dashboard (enter `ADMIN_SECRET`) |

Country comes from **Vercel IP geo** on each review (no browser permission).

## 4. Local dev

Copy the three vars into `.env.local` (not committed). Vite dev server serves `/api/*` via middleware when env is set.
