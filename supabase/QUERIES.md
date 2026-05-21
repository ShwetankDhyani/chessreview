# Example questions (Supabase SQL Editor)

**Total completed reviews**

```sql
select count(*) as matches_reviewed from public.review_events;
```

**Reviews per depth + average time**

```sql
select depth,
       count(*) as reviews,
       round(avg(duration_ms) / 1000.0, 1) as avg_seconds
from public.review_events
group by depth
order by depth;
```

**Reviews by country**

```sql
select country_code, count(*) as reviews
from public.review_events
where country_code is not null
group by country_code
order by reviews desc;
```

**Finer location (city / region) — from IP on Vercel, no browser permission**

```sql
select country_code, region, city, count(*) as reviews
from public.review_events
where country_code is not null
group by country_code, region, city
order by reviews desc;
```

**All reviews in the last 7 days**

```sql
select reviewed_at, username, white_player, black_player, depth, duration_ms,
       country_code, city
from public.review_events
where reviewed_at >= now() - interval '7 days'
order by reviewed_at desc;
```

**Full dashboard JSON (same as `/api/stats` with auth)**

```sql
select public.get_review_stats_summary(null, null, null, null, 200);
```
