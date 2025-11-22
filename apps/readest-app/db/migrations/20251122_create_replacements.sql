-- Migration: Create replacements table for book text replacements
-- Run this on your Supabase/Postgres instance

create type if not exists replacement_scope as enum ('single', 'book');

create table if not exists replacements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  book_hash text not null,
  cfi text null,
  original text not null,
  replacement text not null,
  scope replacement_scope not null default 'single',
  device_id text null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_replacements_user_book on replacements (user_id, book_hash);
create index if not exists idx_replacements_book on replacements (book_hash);
create index if not exists idx_replacements_updated_at on replacements (book_hash, updated_at);
