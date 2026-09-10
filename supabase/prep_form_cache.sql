-- Opponent prep form cache (JSON results, 24h TTL enforced in app code).
-- Run in Supabase → SQL Editor when SUPABASE_* env vars are configured.

create table if not exists public.prep_form_cache (
  cache_key text primary key,
  platform text not null check (platform in ('lichess', 'chesscom')),
  username text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists prep_form_cache_expires_at_idx
  on public.prep_form_cache (expires_at);

create index if not exists prep_form_cache_user_idx
  on public.prep_form_cache (platform, username);

alter table public.prep_form_cache enable row level security;

-- No public policies: server uses service role only.
