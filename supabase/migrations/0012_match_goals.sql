-- ============================================================================
-- Gols por jogo (autores) — base do bônus de ARTILHEIRO, automático pela ESPN
-- (keyEvents). Escrita só pelo cron (role postgres via pooler, ignora RLS).
-- Leitura liberada p/ autenticados (futuro: artilheiro ao vivo / analytics).
-- Recapturável: o cron apaga e regrava os gols de um jogo a cada passada.
-- ============================================================================
create table public.match_goals (
  id          uuid primary key default gen_random_uuid(),
  match_id    integer not null references public.matches(id) on delete cascade,
  scorer      text not null,           -- nome do autor (como vem da ESPN)
  team_code   text,                    -- código FIFA do time do gol (se houver)
  minute      text,                    -- ex.: "36'"
  own_goal    boolean not null default false,  -- gol contra: NÃO conta p/ artilheiro
  penalty     boolean not null default false,  -- pênalti em jogo (conta); shootout é ignorado na captura
  created_at  timestamptz not null default now()
);

create index match_goals_match_idx on public.match_goals (match_id);
create index match_goals_scorer_idx on public.match_goals (lower(scorer));

alter table public.match_goals enable row level security;

-- leitura geral (autenticado); escrita é só do cron (postgres), sem grant a authenticated
create policy match_goals_select_all on public.match_goals
  for select to authenticated using (true);

grant select on public.match_goals to authenticated;
