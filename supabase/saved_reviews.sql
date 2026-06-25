-- Saved game reviews (full PGN + analysis). Run in Supabase SQL Editor if using cloud save on Vercel.

create table if not exists public.saved_reviews (
  id text primary key,
  platform text not null check (platform in ('chesscom', 'lichess')),
  username text not null,
  white_name text not null default 'White',
  black_name text not null default 'Black',
  pgn text not null,
  summary jsonb not null,
  moves jsonb not null,
  move_count integer not null default 0,
  run jsonb,
  saved_at bigint not null
);

create index if not exists saved_reviews_profile_idx
  on public.saved_reviews (platform, username, saved_at desc);

alter table public.saved_reviews enable row level security;
