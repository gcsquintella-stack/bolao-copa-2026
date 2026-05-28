-- ============================================================================
-- Bolão Copa 2026 — Motor de pontuação + apuração automática + realtime.
-- Pontua o palpite vs resultado (90 min): cravada / vencedor+saldo / resultado / erro,
-- com multiplicador por fase. Idempotente e auditável (results_log).
-- ============================================================================

-- A view leaderboard depende das colunas `points`; precisa cair antes do ALTER
-- (é recriada mais abaixo, com o grant de volta).
drop view if exists public.leaderboard;

-- Pontos podem ser fracionários (multiplicadores .5) -> numeric(6,1).
alter table public.predictions
  alter column points type numeric(6,1) using points::numeric;
alter table public.bonus_predictions
  alter column points type numeric(6,1) using points::numeric;
alter table public.bonus_group_predictions
  alter column points type numeric(6,1) using points::numeric;

-- ---------------------------------------------------------------------------
-- Apura UM jogo: (re)calcula points de todos os palpites daquele jogo.
-- Idempotente: sempre sobrescreve (nunca soma). Se o jogo não tem resultado,
-- zera (points/scored_at = null).
-- ---------------------------------------------------------------------------
create or replace function public.score_match(mid integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m   record;
  cfg record;
  mult numeric;
begin
  select * into m from public.matches where id = mid;
  if not found then return; end if;

  if m.home_score is null or m.away_score is null then
    update public.predictions
      set points = null, scored_at = null
      where match_id = mid;
    return;
  end if;

  select * into cfg from public.scoring_config where id;
  mult := case m.stage
    when 'group' then 1.0
    when 'r32'   then cfg.mult_r32
    when 'r16'   then cfg.mult_r16
    when 'qf'    then cfg.mult_qf
    when 'sf'    then cfg.mult_sf
    when 'third' then cfg.mult_sf      -- 3º lugar usa o multiplicador das semis (×3)
    when 'final' then cfg.mult_final
  end;

  update public.predictions p set
    points = mult * (
      case
        -- cravada (placar exato)
        when p.home_score = m.home_score and p.away_score = m.away_score
          then cfg.points_exact
        -- mesmo resultado (casa/fora/empate)
        when sign(p.home_score - p.away_score) = sign(m.home_score - m.away_score) then
          case
            -- não-empate com saldo de gols idêntico -> vencedor + saldo
            when m.home_score <> m.away_score
                 and (p.home_score - p.away_score) = (m.home_score - m.away_score)
              then cfg.points_winner_goaldiff
            else cfg.points_winner_only      -- só o resultado (inclui empate não-cravado)
          end
        else cfg.points_wrong
      end
    ),
    scored_at = now()
  where p.match_id = mid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Apura todos os jogos com resultado (útil após mudar a scoring_config).
-- ---------------------------------------------------------------------------
create or replace function public.score_all_matches()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  for r in select id from public.matches where home_score is not null and away_score is not null loop
    perform public.score_match(r.id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Quando o resultado de um jogo muda: registra auditoria e reapura.
-- (Mudança só de horário/local NÃO dispara apuração.)
-- ---------------------------------------------------------------------------
create or replace function public.on_match_result_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.home_score is distinct from old.home_score)
     or (new.away_score is distinct from old.away_score)
     or (new.status is distinct from old.status) then
    insert into public.results_log
      (match_id, home_score, away_score, prev_home_score, prev_away_score, status, source, entered_by)
    values
      (new.id, new.home_score, new.away_score, old.home_score, old.away_score, new.status, 'system', auth.uid());
    perform public.score_match(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists matches_result_scoring on public.matches;
create trigger matches_result_scoring
  after update on public.matches
  for each row execute function public.on_match_result_change();

-- ---------------------------------------------------------------------------
-- Leaderboard: total de pontos + nº de cravadas (desempate). View pertence ao
-- owner (BYPASSRLS) => agrega todos sem expor palpites individuais.
-- ---------------------------------------------------------------------------
create or replace view public.leaderboard as
select
  p.id            as user_id,
  p.display_name,
  p.avatar_url,
  coalesce((select sum(pr.points) from public.predictions pr where pr.user_id = p.id), 0)
    + coalesce((select bp.points from public.bonus_predictions bp where bp.user_id = p.id), 0)
    + coalesce((select sum(bgp.points) from public.bonus_group_predictions bgp where bgp.user_id = p.id), 0)
    as total_points,
  coalesce((
    select count(*) from public.predictions pr
    join public.matches m on m.id = pr.match_id
    where pr.user_id = p.id and m.home_score is not null and m.away_score is not null
      and pr.home_score = m.home_score and pr.away_score = m.away_score
  ), 0) as exact_count
from public.profiles p;

grant select on public.leaderboard to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: habilita eventos na tabela matches (ranking refaz a busca quando
-- um resultado entra).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end $$;
