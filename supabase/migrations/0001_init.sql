-- ============================================================================
-- Bolão Copa 2026 — Schema inicial
-- Entidades: profiles, teams, matches, predictions, bonus_predictions,
-- bonus_group_predictions, scoring_config, tournament_outcome, results_log,
-- + view leaderboard. RLS é configurado em 0002_rls.sql.
-- Convenções: todo horário em UTC (timestamptz). Placar = tempo normal (90').
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('player', 'admin');
create type public.match_stage as enum ('group', 'r32', 'r16', 'qf', 'sf', 'third', 'final');
create type public.match_status as enum ('scheduled', 'live', 'finished', 'postponed', 'void');

-- ---------------------------------------------------------------------------
-- Helper: updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 com auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url  text,
  role        public.user_role not null default 'player',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- teams (48 seleções). advanced_from_group: marcado pelo admin ao fim dos grupos
-- (usado para apurar o bônus "classificados de grupo").
-- ---------------------------------------------------------------------------
create table public.teams (
  id          smallint primary key generated always as identity,
  name        text not null,
  code        text unique,                 -- código FIFA de 3 letras (ex.: BRA)
  flag        text,                         -- emoji ou URL da bandeira
  group_label char(1),                      -- A..L (12 grupos); null p/ placeholders
  advanced_from_group boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- matches (104 jogos). home/away podem ser null no mata-mata até serem
-- resolvidos; home_label/away_label guardam o placeholder ("Vencedor Grupo A").
-- home_score/away_score = placar do TEMPO NORMAL (90'); null até o resultado.
-- ---------------------------------------------------------------------------
create table public.matches (
  id           integer primary key,         -- número oficial do jogo (1..104)
  stage        public.match_stage not null,
  group_label  char(1),                      -- só na fase de grupos
  home_team_id smallint references public.teams(id),
  away_team_id smallint references public.teams(id),
  home_label   text,                          -- placeholder antes de resolver
  away_label   text,
  kickoff_at   timestamptz not null,          -- UTC
  venue        text,
  home_score   smallint check (home_score >= 0),
  away_score   smallint check (away_score >= 0),
  status       public.match_status not null default 'scheduled',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index matches_kickoff_idx on public.matches (kickoff_at);
create index matches_stage_idx on public.matches (stage);

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers de regra de negócio (STABLE; usados nas policies de RLS)
-- ---------------------------------------------------------------------------

-- É admin? Lê profiles com SECURITY DEFINER para evitar recursão de RLS.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

-- Jogo já travou? (apito já aconteceu)
create or replace function public.match_locked(mid integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(now() >= (select kickoff_at from public.matches where id = mid), false);
$$;

-- Torneio começou? (apito do 1º jogo) — trava bônus e scoring_config.
create or replace function public.tournament_started()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(now() >= (select min(kickoff_at) from public.matches), false);
$$;

-- ---------------------------------------------------------------------------
-- predictions (palpite de placar por usuário/jogo). Único por (user, match).
-- points/is_exact preenchidos pelo motor de pontuação (Fase 5, via service_role).
-- ---------------------------------------------------------------------------
create table public.predictions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  match_id   integer not null references public.matches(id) on delete cascade,
  home_score smallint not null check (home_score >= 0),
  away_score smallint not null check (away_score >= 0),
  points     integer,                        -- preenchido na apuração
  scored_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create index predictions_match_idx on public.predictions (match_id);
create index predictions_user_idx on public.predictions (user_id);

create trigger predictions_set_updated_at
  before update on public.predictions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- bonus_predictions (1 linha por usuário): campeão, vice, artilheiro, revelação.
-- bonus_group_predictions: os 2 classificados que o usuário aposta por grupo.
-- ---------------------------------------------------------------------------
create table public.bonus_predictions (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  champion_team_id   smallint references public.teams(id),
  runner_up_team_id  smallint references public.teams(id),
  top_scorer         text,                    -- nome do artilheiro (texto livre)
  surprise_team_id   smallint references public.teams(id),
  points             integer,                 -- apuração (Fase 5)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger bonus_predictions_set_updated_at
  before update on public.bonus_predictions
  for each row execute function public.set_updated_at();

create table public.bonus_group_predictions (
  user_id     uuid not null references auth.users(id) on delete cascade,
  group_label char(1) not null,
  team_a_id   smallint not null references public.teams(id),
  team_b_id   smallint not null references public.teams(id),
  points      integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, group_label),
  check (team_a_id <> team_b_id)
);

create trigger bonus_group_predictions_set_updated_at
  before update on public.bonus_group_predictions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- scoring_config (singleton): pontos e multiplicadores configuráveis.
-- Trava (não editável) automaticamente após o apito do 1º jogo — enforçado
-- por RLS via tournament_started(), não por flag manual.
-- ---------------------------------------------------------------------------
create table public.scoring_config (
  id                      boolean primary key default true check (id),  -- singleton
  points_exact            integer not null default 10,
  points_winner_goaldiff  integer not null default 6,
  points_winner_only      integer not null default 3,
  points_wrong            integer not null default 0,
  mult_r32                numeric(3,1) not null default 1.5,
  mult_r16                numeric(3,1) not null default 2.0,
  mult_qf                 numeric(3,1) not null default 2.5,
  mult_sf                 numeric(3,1) not null default 3.0,
  mult_final              numeric(3,1) not null default 4.0,
  bonus_group_qualifier   integer not null default 3,   -- por seleção classificada
  bonus_champion          integer not null default 30,
  bonus_runner_up         integer not null default 15,
  bonus_top_scorer        integer not null default 15,
  bonus_surprise          integer not null default 10,
  updated_at              timestamptz not null default now()
);

create trigger scoring_config_set_updated_at
  before update on public.scoring_config
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tournament_outcome (singleton): respostas oficiais dos bônus (admin).
-- ---------------------------------------------------------------------------
create table public.tournament_outcome (
  id                 boolean primary key default true check (id),  -- singleton
  champion_team_id   smallint references public.teams(id),
  runner_up_team_id  smallint references public.teams(id),
  top_scorer         text,
  surprise_team_id   smallint references public.teams(id),
  updated_at         timestamptz not null default now()
);

create trigger tournament_outcome_set_updated_at
  before update on public.tournament_outcome
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- results_log (auditoria de lançamento de resultados)
-- ---------------------------------------------------------------------------
create table public.results_log (
  id              uuid primary key default gen_random_uuid(),
  match_id        integer not null references public.matches(id) on delete cascade,
  home_score      smallint,
  away_score      smallint,
  prev_home_score smallint,
  prev_away_score smallint,
  status          public.match_status,
  source          text not null default 'admin',  -- 'admin' | 'api-football'
  entered_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create index results_log_match_idx on public.results_log (match_id);

-- ---------------------------------------------------------------------------
-- Criação automática de profile no signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Impede escalonamento de privilégio: jogador não muda o próprio role.
-- Permite quando rodado pelo backend (auth.uid() null) ou por um admin.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_admin(auth.uid()) then
      raise exception 'Apenas admin pode alterar o papel (role) de um perfil.';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------------------
-- Leaderboard (view): totais agregados. View pertence ao owner (postgres,
-- BYPASSRLS) => soma os pontos de TODOS sem expor palpites individuais.
-- Bônus serão somados aqui na Fase 5 (motor de pontuação).
-- ---------------------------------------------------------------------------
create view public.leaderboard as
select
  p.id            as user_id,
  p.display_name,
  p.avatar_url,
  coalesce((select sum(pr.points) from public.predictions pr where pr.user_id = p.id), 0)
    + coalesce((select bp.points from public.bonus_predictions bp where bp.user_id = p.id), 0)
    + coalesce((select sum(bgp.points) from public.bonus_group_predictions bgp where bgp.user_id = p.id), 0)
    as total_points
from public.profiles p;
