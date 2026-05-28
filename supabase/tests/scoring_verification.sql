-- ============================================================================
-- Verificação do motor de pontuação (rode DEPOIS de 0006_scoring.sql).
-- Cobre: cravada(10), vencedor+saldo(6), só resultado(3), erro(0), empates,
-- multiplicador da final(×4) e IDEMPOTÊNCIA. Roda em rollback (não grava nada).
-- Saída: mensagem de erro começando com "OK >>>" (proposital) com os pontos
-- calculados; ou "FAIL: ..." se algo estiver errado.
-- ============================================================================
do $$
declare
  u1 uuid := '00000000-0000-0000-0000-000000000001'; -- cravadas
  u2 uuid := '00000000-0000-0000-0000-000000000002'; -- saldo
  u3 uuid := '00000000-0000-0000-0000-000000000003'; -- só resultado
  u4 uuid := '00000000-0000-0000-0000-000000000004'; -- erro
  u5 uuid := '00000000-0000-0000-0000-000000000005'; -- previu empate, deu vitória
  v numeric;
  v2 numeric;
begin
  -- usuários
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  select '00000000-0000-0000-0000-000000000000', x, 'authenticated','authenticated',
         x::text||'@t.local','x', now(), now(), now(), '{}'::jsonb
  from unnest(array[u1,u2,u3,u4,u5]) x;

  -- jogos SEM resultado ainda
  insert into public.matches (id, stage, kickoff_at, status) values
    (9001, 'group', now() - interval '2 hour', 'scheduled'),
    (9003, 'group', now() - interval '2 hour', 'scheduled'),
    (9002, 'final', now() - interval '2 hour', 'scheduled');

  -- palpites
  -- 9001 (resultado será 2x1, casa vence por 1):
  insert into public.predictions (user_id, match_id, home_score, away_score) values
    (u1, 9001, 2, 1),  -- cravada -> 10
    (u2, 9001, 3, 2),  -- vencedor + saldo (+1) -> 6
    (u3, 9001, 4, 0),  -- só resultado (casa vence, saldo difere) -> 3
    (u4, 9001, 0, 1),  -- erro (previu fora) -> 0
    (u5, 9001, 1, 1);  -- erro (previu empate) -> 0
  -- 9003 (resultado será 1x1, empate):
  insert into public.predictions (user_id, match_id, home_score, away_score) values
    (u1, 9003, 1, 1),  -- cravada -> 10
    (u2, 9003, 2, 2),  -- empate não-cravado -> só resultado 3 (NÃO 6)
    (u3, 9003, 1, 0);  -- erro -> 0
  -- 9002 final (resultado será 3x0):
  insert into public.predictions (user_id, match_id, home_score, away_score) values
    (u1, 9002, 3, 0),  -- cravada * 4 -> 40
    (u2, 9002, 4, 1);  -- vencedor+saldo(+3) * 4 -> 24

  -- lança resultados -> dispara apuração automática (trigger)
  update public.matches set home_score = 2, away_score = 1, status = 'finished' where id = 9001;
  update public.matches set home_score = 1, away_score = 1, status = 'finished' where id = 9003;
  update public.matches set home_score = 3, away_score = 0, status = 'finished' where id = 9002;

  -- asserts
  select points into v from public.predictions where user_id=u1 and match_id=9001;
  if v is distinct from 10 then raise exception 'FAIL cravada: esperava 10, veio %', v; end if;
  select points into v from public.predictions where user_id=u2 and match_id=9001;
  if v is distinct from 6 then raise exception 'FAIL vencedor+saldo: esperava 6, veio %', v; end if;
  select points into v from public.predictions where user_id=u3 and match_id=9001;
  if v is distinct from 3 then raise exception 'FAIL so resultado: esperava 3, veio %', v; end if;
  select points into v from public.predictions where user_id=u4 and match_id=9001;
  if v is distinct from 0 then raise exception 'FAIL erro(fora): esperava 0, veio %', v; end if;
  select points into v from public.predictions where user_id=u5 and match_id=9001;
  if v is distinct from 0 then raise exception 'FAIL erro(empate): esperava 0, veio %', v; end if;

  select points into v from public.predictions where user_id=u1 and match_id=9003;
  if v is distinct from 10 then raise exception 'FAIL empate cravado: esperava 10, veio %', v; end if;
  select points into v from public.predictions where user_id=u2 and match_id=9003;
  if v is distinct from 3 then raise exception 'FAIL empate nao-cravado: esperava 3 (nao 6), veio %', v; end if;
  select points into v from public.predictions where user_id=u3 and match_id=9003;
  if v is distinct from 0 then raise exception 'FAIL empate erro: esperava 0, veio %', v; end if;

  select points into v from public.predictions where user_id=u1 and match_id=9002;
  if v is distinct from 40 then raise exception 'FAIL final cravada x4: esperava 40, veio %', v; end if;
  select points into v from public.predictions where user_id=u2 and match_id=9002;
  if v is distinct from 24 then raise exception 'FAIL final saldo x4: esperava 24, veio %', v; end if;

  -- idempotência: reapura 9001 e confere que NÃO dobrou
  perform public.score_match(9001);
  perform public.score_match(9001);
  select points into v from public.predictions where user_id=u1 and match_id=9001;
  if v is distinct from 10 then raise exception 'FAIL idempotencia: cravada virou % apos reapurar', v; end if;

  -- leaderboard: u1 deve somar 10+10+40 = 60, com 3 cravadas
  select total_points, exact_count into v, v2 from public.leaderboard where user_id=u1;
  if v is distinct from 60 then raise exception 'FAIL leaderboard total u1: esperava 60, veio %', v; end if;
  if v2 is distinct from 3 then raise exception 'FAIL leaderboard cravadas u1: esperava 3, veio %', v2; end if;

  -- tudo certo -> mostra evidência e desfaz (rollback via exceção)
  raise exception 'OK >>> faixas 10/6/3/0 + empate(3) + final x4 (40/24) + idempotencia + leaderboard(u1=60, cravadas=3): TUDO CORRETO';
end $$;
