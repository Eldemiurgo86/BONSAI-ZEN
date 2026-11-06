-- Esquema de Bonsái Zen (PostgreSQL 14+).
-- Idempotente: se puede ejecutar varias veces con `npm run db:migrate`.
-- Compatible con Vercel Postgres (Neon), Supabase y Postgres local.

-- Usuarios. El correo es único y se guarda en minúsculas (lo normaliza la aplicación).
create table if not exists users (
  id              bigserial primary key,
  name            text        not null check (char_length(name) between 1 and 40),
  email           text        not null unique check (position('@' in email) > 1),
  password_hash   text        not null,
  is_premium      boolean     not null default false,
  stripe_customer_id text     unique,
  created_at      timestamptz not null default now()
);

-- Sesiones. El id guardado es el SHA-256 del token que viaja en la cookie (el token nunca se almacena en claro).
create table if not exists sessions (
  id          text        primary key,
  user_id     bigint      not null references users(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions (user_id);
create index if not exists sessions_expires_idx on sessions (expires_at);

-- Progreso de cada jugador: nivel actual, estación, bonsái, monedas, vidas, dificultad y estadísticas.
create table if not exists player_progress (
  user_id        bigint      primary key references users(id) on delete cascade,
  difficulty     text        not null default 'novato' check (difficulty in ('novato', 'pro')),
  current_level  int         not null default 1 check (current_level between 1 and 48),
  season         text        not null default 'primavera'
                   check (season in ('primavera', 'verano', 'otono', 'invierno')),
  bonsai_seed    int         not null,
  coins          int         not null default 0 check (coins >= 0),
  boosters       jsonb       not null default '{"scissors":0,"rain":0,"fertilizer":0}'::jsonb,
  lives          int         not null default 5 check (lives between 0 and 5),
  lives_anchor   timestamptz not null default now(),
  stats          jsonb       not null default '{}'::jsonb,
  achievements   text[]      not null default '{}',
  updated_at     timestamptz not null default now()
);

-- Historial de partidas: alimenta el ranking y las estadísticas del perfil.
create table if not exists level_results (
  id          bigserial   primary key,
  user_id     bigint      not null references users(id) on delete cascade,
  level_id    int         not null check (level_id between 1 and 48),
  difficulty  text        not null check (difficulty in ('novato', 'pro')),
  won         boolean     not null,
  stars       smallint    not null check (stars between 0 and 3),
  score       int         not null check (score >= 0),
  created_at  timestamptz not null default now()
);
create index if not exists level_results_user_idx on level_results (user_id, created_at desc);
create index if not exists level_results_ranking_idx on level_results (difficulty, score desc);

-- Compras (Stripe). Una fila por Checkout Session pagada.
create table if not exists purchases (
  id                 bigserial   primary key,
  user_id            bigint      references users(id) on delete set null,
  stripe_session_id  text        not null unique,
  product            text        not null,
  amount_cents       int,
  currency           text,
  status             text        not null,
  created_at         timestamptz not null default now()
);

-- Eventos de webhook ya procesados (idempotencia: Stripe puede reenviar un evento).
create table if not exists stripe_events (
  id           text        primary key,
  type         text        not null,
  received_at  timestamptz not null default now()
);
