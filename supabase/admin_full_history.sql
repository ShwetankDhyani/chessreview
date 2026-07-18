-- Run in Supabase SQL editor after deploy so admin recent reviews are uncapped.
-- Safe to re-run (create or replace).

create or replace function public.get_admin_review_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'reviewsServed', (select count(*)::int from public.review_events),
    'countryCount', (
      select count(distinct country_code)::int
      from public.review_events
      where country_code is not null and country_code <> ''
    ),
    'countries', coalesce((
      select jsonb_agg(
        jsonb_build_object('countryCode', country_code, 'count', cnt)
        order by cnt desc
      )
      from (
        select country_code, count(*)::int as cnt
        from public.review_events
        where country_code is not null and country_code <> ''
        group by country_code
        order by cnt desc
        limit 40
      ) c
    ), '[]'::jsonb),
    'byDepth', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'depth', depth,
          'count', cnt,
          'avgDurationMs', avg_ms
        )
        order by depth
      )
      from (
        select depth, count(*)::int as cnt, round(avg(duration_ms))::int as avg_ms
        from public.review_events
        group by depth
      ) d
    ), '[]'::jsonb),
    'ratingSummary', jsonb_build_object(
      'avgWhite', (select round(avg(white_rating))::int from public.review_events where white_rating is not null),
      'avgBlack', (select round(avg(black_rating))::int from public.review_events where black_rating is not null),
      'ratedGames', (select count(*)::int from public.review_events where white_rating is not null or black_rating is not null)
    ),
    'recent', coalesce((
      select jsonb_agg(row_to_json(r) order by r.reviewed_at desc)
      from (
        select
          reviewed_at,
          username,
          reviewer_platform,
          white_player,
          black_player,
          white_rating,
          black_rating,
          result,
          plies,
          depth,
          duration_ms,
          country_code,
          region,
          city,
          source
        from public.review_events
        order by reviewed_at desc
      ) r
    ), '[]'::jsonb),
    'recentTotal', (select count(*)::int from public.review_events)
  );
$$;

revoke all on function public.get_admin_review_stats() from public;
grant execute on function public.get_admin_review_stats() to service_role;
