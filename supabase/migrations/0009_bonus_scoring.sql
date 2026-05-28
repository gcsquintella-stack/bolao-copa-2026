-- ============================================================================
-- Bolão Copa 2026 — Apuração dos palpites bônus.
-- Classificados de grupo, campeão, vice, artilheiro, revelação (auto).
-- Revelação: entre seleções 21+ que chegaram aos 16-avos, a que foi mais longe;
-- empate -> pontos -> saldo -> gols -> pior ranking FIFA (decisor único).
-- ============================================================================

-- valor numérico de "profundidade" de cada fase (3º lugar = nível de semifinalista)
create or replace function public.stage_rank(s public.match_stage)
returns int language sql immutable as $$
  select case s
    when 'group' then 0 when 'r32' then 1 when 'r16' then 2
    when 'qf' then 3 when 'sf' then 4 when 'third' then 4 when 'final' then 5 end;
$$;

-- fase mais avançada que uma seleção alcançou (em jogos já com resultado)
create or replace function public.team_stage_reached(tid smallint)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(max(public.stage_rank(m.stage)), -1)
  from public.matches m
  where (m.home_team_id = tid or m.away_team_id = tid)
    and m.home_score is not null and m.away_score is not null;
$$;

-- campanha da seleção (90 min): pontos, saldo, gols
create or replace function public.team_record(tid smallint)
returns table(pts int, gd int, gf int)
language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(case
      when (m.home_team_id = tid and m.home_score > m.away_score)
        or (m.away_team_id = tid and m.away_score > m.home_score) then 3
      when m.home_score = m.away_score then 1 else 0 end), 0)::int,
    coalesce(sum(case when m.home_team_id = tid
      then m.home_score - m.away_score else m.away_score - m.home_score end), 0)::int,
    coalesce(sum(case when m.home_team_id = tid then m.home_score else m.away_score end), 0)::int
  from public.matches m
  where (m.home_team_id = tid or m.away_team_id = tid)
    and m.home_score is not null and m.away_score is not null;
$$;

-- revelação automática pela regra acordada
create or replace function public.compute_revelacao()
returns smallint language sql stable security definer set search_path = public as $$
  select t.id
  from public.teams t, lateral public.team_record(t.id) r
  where t.fifa_rank >= 21
    and public.team_stage_reached(t.id) >= 1   -- piso: 16-avos
  order by public.team_stage_reached(t.id) desc, r.pts desc, r.gd desc, r.gf desc, t.fifa_rank desc
  limit 1;
$$;

-- apura todos os bônus (idempotente). Revelação = override do admin OU auto.
create or replace function public.score_bonus()
returns void language plpgsql security definer set search_path = public as $$
declare cfg record; o record; rev smallint;
begin
  select * into cfg from public.scoring_config where id;
  select * into o from public.tournament_outcome where id;
  rev := coalesce(o.surprise_team_id, public.compute_revelacao());

  -- classificados de grupo: +qualifier por seleção apontada que avançou
  update public.bonus_group_predictions g set points = cfg.bonus_group_qualifier * (
    coalesce((select 1 from public.teams t where t.id = g.team_a_id and t.advanced_from_group), 0)
    + coalesce((select 1 from public.teams t where t.id = g.team_b_id and t.advanced_from_group), 0)
  );

  -- bônus únicos: campeão / vice / revelação / artilheiro
  update public.bonus_predictions b set points =
      (case when o.champion_team_id  is not null and b.champion_team_id  = o.champion_team_id  then cfg.bonus_champion   else 0 end)
    + (case when o.runner_up_team_id is not null and b.runner_up_team_id = o.runner_up_team_id then cfg.bonus_runner_up  else 0 end)
    + (case when rev is not null and b.surprise_team_id = rev then cfg.bonus_surprise else 0 end)
    + (case when o.top_scorer is not null and b.top_scorer is not null
            and lower(trim(b.top_scorer)) = lower(trim(o.top_scorer)) then cfg.bonus_top_scorer else 0 end);
end;
$$;
