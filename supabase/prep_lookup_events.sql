-- H2H (prep) lookup analytics — one row per successful form lookup.
-- Run in Supabase → SQL Editor after schema.sql / prep_form_cache.sql.

create table if not exists public.prep_lookup_events (
  id uuid primary key default gen_random_uuid(),
  looked_up_at timestamptz not null default now(),
  username text not null,
  platform text not null,
  self_username text,
  self_platform text,
  compare boolean not null default false,
  compare_skipped boolean not null default false,
  compare_skip_reason text,
  cache_hit boolean,
  self_cache_hit boolean,
  sample_size integer,
  self_sample_size integer,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  country_code text,
  region text,
  city text,
  latitude double precision,
  longitude double precision,
  timezone text,
  locale text,
  source text
);

create index if not exists prep_lookup_events_looked_up_at_idx
  on public.prep_lookup_events (looked_up_at desc);

create index if not exists prep_lookup_events_country_idx
  on public.prep_lookup_events (country_code);

create index if not exists prep_lookup_events_platform_idx
  on public.prep_lookup_events (platform);

alter table public.prep_lookup_events enable row level security;

-- Snapshot for the admin dashboard (called server-side only).
create or replace function public.get_admin_prep_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'lookupsServed', (select count(*)::int from public.prep_lookup_events),
    'countryCount', (
      select count(distinct country_code)::int
      from public.prep_lookup_events
      where country_code is not null and country_code <> ''
    ),
    'countries', coalesce((
      select jsonb_agg(
        jsonb_build_object('countryCode', country_code, 'count', cnt)
        order by cnt desc
      )
      from (
        select country_code, count(*)::int as cnt
        from public.prep_lookup_events
        where country_code is not null and country_code <> ''
        group by country_code
        order by cnt desc
        limit 40
      ) c
    ), '[]'::jsonb),
    'byPlatform', coalesce((
      select jsonb_agg(
        jsonb_build_object('platform', platform, 'count', cnt)
        order by cnt desc
      )
      from (
        select platform, count(*)::int as cnt
        from public.prep_lookup_events
        group by platform
      ) p
    ), '[]'::jsonb),
    'modeSummary', jsonb_build_object(
      'solo', (
        select count(*)::int from public.prep_lookup_events
        where not compare and not compare_skipped
      ),
      'compare', (
        select count(*)::int from public.prep_lookup_events where compare
      ),
      'compareSkipped', (
        select count(*)::int from public.prep_lookup_events where compare_skipped
      )
    ),
    'cacheSummary', jsonb_build_object(
      'hits', (
        select count(*)::int from public.prep_lookup_events where cache_hit is true
      ),
      'misses', (
        select count(*)::int from public.prep_lookup_events where cache_hit is false
      ),
      'hitRatePct', (
        select case
          when count(*) filter (where cache_hit is not null) = 0 then null
          else round(
            100.0 * count(*) filter (where cache_hit is true)
            / count(*) filter (where cache_hit is not null)
          )::int
        end
        from public.prep_lookup_events
      )
    ),
    'avgDurationMs', (
      select round(avg(duration_ms))::int
      from public.prep_lookup_events
      where duration_ms is not null
    ),
    'recent', coalesce((
      select jsonb_agg(row_to_json(r) order by r.looked_up_at desc)
      from (
        select
          looked_up_at,
          username,
          platform,
          self_username,
          self_platform,
          compare,
          compare_skipped,
          compare_skip_reason,
          cache_hit,
          self_cache_hit,
          sample_size,
          self_sample_size,
          duration_ms,
          country_code,
          region,
          city,
          source
        from public.prep_lookup_events
        order by looked_up_at desc
      ) r
    ), '[]'::jsonb),
    'recentTotal', (select count(*)::int from public.prep_lookup_events)
  );
$$;

revoke all on function public.get_admin_prep_stats() from public;
grant execute on function public.get_admin_prep_stats() to service_role;
