-- Verificação da apuração de bônus + regra da revelação. Rollback (nada gravado).
-- Cenário (jogos sintéticos, só seleções 21+ + adversário top-10 que é ignorado):
--   Equador(23): chega às QUARTAS, +1 de saldo   |
--   Panamá(33):  chega às QUARTAS, +3 de saldo    | -> mesma fase; Panamá vence
--   Cabo Verde(69): chega só às OITAVAS           |    por DESEMPENHO (saldo), não ranking
-- Revelação esperada = Panamá.
-- Bônus do u1: classificado certo (1) + campeão (Panamá=12) + revelação (Panamá=4) = ...
do $$
declare
  ecu smallint; pan smallint; cpv smallint; bra smallint;
  u1 uuid := '00000000-0000-0000-0000-0000000000b1';
  rev smallint; gpts numeric; bpts numeric;
begin
  select id into ecu from public.teams where code='ECU';
  select id into pan from public.teams where code='PAN';
  select id into cpv from public.teams where code='CPV';
  select id into bra from public.teams where code='BRA'; -- top10, ignorado na revelação

  insert into public.matches(id,stage,kickoff_at,status,home_team_id,away_team_id,home_score,away_score) values
    (9101,'qf', now()-interval '1 day','finished', ecu, bra, 2, 1),  -- Equador QF (+1)
    (9102,'qf', now()-interval '1 day','finished', pan, bra, 3, 0),  -- Panamá QF (+3)
    (9103,'r16',now()-interval '2 day','finished', cpv, bra, 0, 1);  -- Cabo Verde só oitavas

  -- revelação
  rev := public.compute_revelacao();
  if rev is distinct from pan then
    raise exception 'FAIL revelacao: esperava Panama(%) e veio %', pan, rev;
  end if;

  -- usuário + palpites bônus
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000', u1,'authenticated','authenticated',
    'b1@test.local','x', now(), now(), now(), '{}'::jsonb);

  -- marca classificados oficiais e resultado oficial
  update public.teams set advanced_from_group = true where id in (ecu, pan);
  update public.tournament_outcome set champion_team_id = pan, surprise_team_id = null where id;

  -- palpites do u1: grupo aposta Equador+CaboVerde (só Equador avançou -> 1 acerto)
  insert into public.bonus_group_predictions(user_id, group_label, team_a_id, team_b_id)
    values (u1,'A', ecu, cpv);
  -- campeão Panamá (acerta) + revelação Panamá (acerta, auto)
  insert into public.bonus_predictions(user_id, champion_team_id, surprise_team_id)
    values (u1, pan, pan);

  perform public.score_bonus();

  select points into gpts from public.bonus_group_predictions where user_id=u1 and group_label='A';
  select points into bpts from public.bonus_predictions where user_id=u1;

  -- esperado: grupo = 1 (1 acerto x bonus_group_qualifier=1)
  if gpts is distinct from 1 then raise exception 'FAIL grupo: esperava 1, veio %', gpts; end if;
  -- esperado: campeão(12) + revelação(4) = 16
  if bpts is distinct from 16 then raise exception 'FAIL unicos: esperava 16, veio %', bpts; end if;

  raise exception 'OK >>> revelacao=Panama (desempenho>ranking, QF>R16) + bonus grupo=1 + unicos=16 (camp12+rev4): TUDO CORRETO';
end $$;
