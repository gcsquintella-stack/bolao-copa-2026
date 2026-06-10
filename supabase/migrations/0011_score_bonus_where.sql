-- ============================================================================
-- Fix: score_bonus() chamado pela sessão `authenticated` (admin via RPC) batia
-- no guard do Supabase "UPDATE requires a WHERE clause" (proteção contra update
-- em massa acidental). Os dois UPDATEs atualizam TODAS as linhas de propósito;
-- adicionamos `where true` pra satisfazer o guard sem mudar o comportamento.
-- De quebra, gate de admin (permite service role / backend com auth.uid() nulo).
-- Corpo idêntico ao 0009, só com o guard + os `where true`.
-- ============================================================================
create or replace function public.score_bonus()
returns void language plpgsql security definer set search_path = public as $$
declare cfg record; o record; rev smallint;
begin
  -- só admin (ou backend sem sessão: auth.uid() nulo) pode apurar
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Apenas admin pode apurar bônus.';
  end if;

  select * into cfg from public.scoring_config where id;
  select * into o from public.tournament_outcome where id;
  rev := coalesce(o.surprise_team_id, public.compute_revelacao());

  -- classificados de grupo: +qualifier por seleção apontada que avançou
  update public.bonus_group_predictions g set points = cfg.bonus_group_qualifier * (
    coalesce((select 1 from public.teams t where t.id = g.team_a_id and t.advanced_from_group), 0)
    + coalesce((select 1 from public.teams t where t.id = g.team_b_id and t.advanced_from_group), 0)
  )
  where true;

  -- bônus únicos: campeão / vice / revelação / artilheiro
  update public.bonus_predictions b set points =
      (case when o.champion_team_id  is not null and b.champion_team_id  = o.champion_team_id  then cfg.bonus_champion   else 0 end)
    + (case when o.runner_up_team_id is not null and b.runner_up_team_id = o.runner_up_team_id then cfg.bonus_runner_up  else 0 end)
    + (case when rev is not null and b.surprise_team_id = rev then cfg.bonus_surprise else 0 end)
    + (case when o.top_scorer is not null and b.top_scorer is not null
            and lower(trim(b.top_scorer)) = lower(trim(o.top_scorer)) then cfg.bonus_top_scorer else 0 end)
  where true;
end;
$$;
