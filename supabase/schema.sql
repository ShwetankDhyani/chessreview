-- Run once in Supabase → SQL Editor (free tier).
-- Stores every *completed* game review for filtering and reporting.

create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  reviewed_at timestamptz not null default now(),
  username text,
  white_player text not null default 'Unknown',
  black_player text not null default 'Unknown',
  plies integer,
  depth integer not null check (depth between 1 and 30),
  duration_ms integer not null check (duration_ms >= 0),
  country_code text,
  region text,
  city text,
  latitude double precision,
  longitude double precision,
  timezone text,
  locale text,
  client_ip text
);

create index if not exists idx_review_events_reviewed_at
  on public.review_events (reviewed_at desc);
create index if not exists idx_review_events_depth
  on public.review_events (depth);
create index if not exists idx_review_events_country
  on public.review_events (country_code);
create index if not exists idx_review_events_username
  on public.review_events (username);

alter table public.review_events enable row level security;

-- No public policies: only the service role (Vercel API) can read/write.

create or replace function public.get_review_stats_summary(
  filter_country text default null,
  filter_depth integer default null,
  filter_from timestamptz default null,
  filter_to timestamptz default null,
  recent_limit integer default 100
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select *
    from public.review_events e
    where (filter_country is null or e.country_code ilike filter_country)
      and (filter_depth is null or e.depth = filter_depth)
      and (filter_from is null or e.reviewed_at >= filter_from)
      and (filter_to is null or e.reviewed_at <= filter_to)
  )
  select jsonb_build_object(
    'matchesReviewed', (select count(*)::int from base),
    'byDepth', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'depth', depth,
          'count', cnt,
          'avgDurationMs', avg_ms
        ) order by depth
      )
      from (
        select
          depth,
          count(*)::int as cnt,
          round(avg(duration_ms))::int as avg_ms
        from base
        group by depth
      ) d
    ), '[]'::jsonb),
    'byCountry', coalesce((
      select jsonb_agg(
        jsonb_build_object('countryCode', country_code, 'count', cnt)
        order by cnt desc
      )
      from (
        select country_code, count(*)::int as cnt
        from base
        where country_code is not null
        group by country_code
      ) c
    ), '[]'::jsonb),
    'byLocation', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'countryCode', country_code,
          'region', region,
          'city', city,
          'count', cnt
        ) order by cnt desc
      )
      from (
        select country_code, region, city, count(*)::int as cnt
        from base
        where country_code is not null
        group by country_code, region, city
      ) loc
    ), '[]'::jsonb),
    'recentReviews', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'reviewedAt', reviewed_at,
          'username', username,
          'white', white_player,
          'black', black_player,
          'plies', plies,
          'depth', depth,
          'durationMs', duration_ms,
          'countryCode', country_code,
          'region', region,
          'city', city,
          'timezone', timezone,
          'locale', locale
        ) order by reviewed_at desc
      )
      from (
        select *
        from base
        order by reviewed_at desc
        limit greatest(1, least(recent_limit, 500))
      ) r
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_review_stats_summary from public;
grant execute on function public.get_review_stats_summary to service_role;

-- Public snapshot for the site footer popup (no secrets).
create or replace function public.get_public_review_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'matchesReviewed', (select count(*)::int from public.review_events),
    'countryCount', (
      select count(distinct country_code)::int
      from public.review_events
      where country_code is not null
    ),
    'reviewsByDate', coalesce((
      select jsonb_agg(
        jsonb_build_object('date', day, 'count', cnt) order by day
      )
      from (
        select (reviewed_at at time zone 'utc')::date as day, count(*)::int as cnt
        from public.review_events
        where reviewed_at >= (now() at time zone 'utc') - interval '90 days'
        group by day
        order by day
      ) d
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_public_review_stats from public;
grant execute on function public.get_public_review_stats to service_role;
