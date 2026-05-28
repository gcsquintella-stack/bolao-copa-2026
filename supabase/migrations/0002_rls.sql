-- ============================================================================
-- Bolão Copa 2026 — Row Level Security (RLS)
-- Princípios:
--  • App exige login => todas as policies são `to authenticated` (anon sem acesso).
--  • Palpite só visível pelo dono antes do apito; público e imutável depois.
--  • INSERT/UPDATE de palpite só pelo dono e só enquanto now() < kickoff.
--  • Admin NÃO cria/edita palpite de ninguém (policies amarram user_id=auth.uid()).
--  • Lançar placar (matches) e editar scoring_config: só admin; config trava no 1º jogo.
-- ============================================================================

-- Tira qualquer acesso do papel anônimo (app é login-only).
revoke all on all tables in schema public from anon;

alter table public.profiles                 enable row level security;
alter table public.teams                     enable row level security;
alter table public.matches                   enable row level security;
alter table public.predictions               enable row level security;
alter table public.bonus_predictions         enable row level security;
alter table public.bonus_group_predictions   enable row level security;
alter table public.scoring_config            enable row level security;
alter table public.tournament_outcome        enable row level security;
alter table public.results_log               enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_all on public.profiles
  for select to authenticated using (true);

create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- (mudança de role é bloqueada pelo trigger guard_profile_role)

create policy profiles_admin_update on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- teams (leitura geral; escrita só admin)
-- ---------------------------------------------------------------------------
create policy teams_select_all on public.teams
  for select to authenticated using (true);

create policy teams_admin_insert on public.teams
  for insert to authenticated with check (public.is_admin());
create policy teams_admin_update on public.teams
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy teams_admin_delete on public.teams
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- matches (leitura geral; escrita/placar só admin)
-- ---------------------------------------------------------------------------
create policy matches_select_all on public.matches
  for select to authenticated using (true);

create policy matches_admin_insert on public.matches
  for insert to authenticated with check (public.is_admin());
create policy matches_admin_update on public.matches
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy matches_admin_delete on public.matches
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- predictions  [CRÍTICO]
-- ---------------------------------------------------------------------------
-- SELECT: o dono sempre vê o seu; os dos outros só depois do apito.
create policy predictions_select on public.predictions
  for select to authenticated
  using (user_id = auth.uid() or public.match_locked(match_id));

-- INSERT: só o próprio dono e só antes do apito.
create policy predictions_insert_own_before_kickoff on public.predictions
  for insert to authenticated
  with check (user_id = auth.uid() and not public.match_locked(match_id));

-- UPDATE: só o próprio dono e só antes do apito (depois é imutável).
create policy predictions_update_own_before_kickoff on public.predictions
  for update to authenticated
  using (user_id = auth.uid() and not public.match_locked(match_id))
  with check (user_id = auth.uid() and not public.match_locked(match_id));
-- (sem policy de DELETE => deletar é negado)

-- ---------------------------------------------------------------------------
-- bonus_predictions / bonus_group_predictions
-- (visível p/ outros só após o apito da abertura; editável só até lá)
-- ---------------------------------------------------------------------------
create policy bonus_select on public.bonus_predictions
  for select to authenticated
  using (user_id = auth.uid() or public.tournament_started());
create policy bonus_insert_own on public.bonus_predictions
  for insert to authenticated
  with check (user_id = auth.uid() and not public.tournament_started());
create policy bonus_update_own on public.bonus_predictions
  for update to authenticated
  using (user_id = auth.uid() and not public.tournament_started())
  with check (user_id = auth.uid() and not public.tournament_started());

create policy bonus_group_select on public.bonus_group_predictions
  for select to authenticated
  using (user_id = auth.uid() or public.tournament_started());
create policy bonus_group_insert_own on public.bonus_group_predictions
  for insert to authenticated
  with check (user_id = auth.uid() and not public.tournament_started());
create policy bonus_group_update_own on public.bonus_group_predictions
  for update to authenticated
  using (user_id = auth.uid() and not public.tournament_started())
  with check (user_id = auth.uid() and not public.tournament_started());

-- ---------------------------------------------------------------------------
-- scoring_config (leitura geral; edição só admin e só antes do 1º jogo)
-- ---------------------------------------------------------------------------
create policy scoring_select_all on public.scoring_config
  for select to authenticated using (true);
create policy scoring_admin_insert on public.scoring_config
  for insert to authenticated
  with check (public.is_admin() and not public.tournament_started());
create policy scoring_admin_update on public.scoring_config
  for update to authenticated
  using (public.is_admin() and not public.tournament_started())
  with check (public.is_admin() and not public.tournament_started());

-- ---------------------------------------------------------------------------
-- tournament_outcome (leitura geral; escrita só admin)
-- ---------------------------------------------------------------------------
create policy outcome_select_all on public.tournament_outcome
  for select to authenticated using (true);
create policy outcome_admin_insert on public.tournament_outcome
  for insert to authenticated with check (public.is_admin());
create policy outcome_admin_update on public.tournament_outcome
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- results_log (leitura geral p/ auditoria; insert só admin; sem update/delete)
-- ---------------------------------------------------------------------------
create policy results_log_select_all on public.results_log
  for select to authenticated using (true);
create policy results_log_admin_insert on public.results_log
  for insert to authenticated with check (public.is_admin());

-- ============================================================================
-- GRANTS explícitos (não dependemos do toggle "expose new tables").
-- RLS continua sendo o guarda real de cada linha.
-- ============================================================================
grant usage on schema public to authenticated;

-- Leitura
grant select on
  public.profiles, public.teams, public.matches, public.scoring_config,
  public.tournament_outcome, public.results_log,
  public.bonus_predictions, public.bonus_group_predictions, public.leaderboard
  to authenticated;

-- profiles: dono atualiza (role barrado por trigger)
grant insert, update on public.profiles to authenticated;

-- teams / matches: escrita gated por RLS (admin)
grant insert, update, delete on public.teams to authenticated;
grant insert, update, delete on public.matches to authenticated;

-- scoring_config / tournament_outcome: escrita gated por RLS (admin)
grant insert, update on public.scoring_config to authenticated;
grant insert, update on public.tournament_outcome to authenticated;

-- results_log: insert gated por RLS (admin)
grant insert on public.results_log to authenticated;

-- bônus: escrita do próprio dono (gated por RLS)
grant insert, update on public.bonus_predictions to authenticated;
grant insert, update on public.bonus_group_predictions to authenticated;

-- predictions: COLUNA a COLUNA. Usuário nunca escreve `points`/`scored_at`
-- (isso é só do motor de pontuação via service_role, que ignora RLS).
revoke all on public.predictions from authenticated;
grant select on public.predictions to authenticated;
grant insert (user_id, match_id, home_score, away_score) on public.predictions to authenticated;
grant update (home_score, away_score) on public.predictions to authenticated;
