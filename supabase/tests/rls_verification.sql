-- ============================================================================
-- Bolão Copa 2026 — Verificação de RLS (rode DEPOIS das migrations 0001-0003).
-- Simula usuários comuns vs admin via `set local role` + request.jwt.claims.
-- Tudo roda dentro de transações com ROLLBACK: NÃO grava nada no banco.
-- Saída esperada: várias linhas "PASS:" e, no fim, "ALL CHECKS PASSED".
-- Se algo falhar, aparece um erro "FAIL: ..." e a transação é abortada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BLOCO 1 — Torneio NÃO começado (só jogo futuro): trava da scoring_config
-- ----------------------------------------------------------------------------
begin;
do $$
declare
  ad uuid := '33333333-3333-3333-3333-333333333333';
  p1 uuid := '11111111-1111-1111-1111-111111111111';
  n  integer;
begin
  -- setup (como postgres, ignora RLS)
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000', ad, 'authenticated','authenticated',
          'ad@test.local','x', now(), now(), now(), '{}'::jsonb),
         ('00000000-0000-0000-0000-000000000000', p1, 'authenticated','authenticated',
          'p1@test.local','x', now(), now(), now(), '{}'::jsonb);
  update public.profiles set role = 'admin' where id = ad;

  insert into public.matches (id, stage, kickoff_at, status)
  values (9001, 'group', now() + interval '10 days', 'scheduled');  -- futuro

  if public.tournament_started() then
    raise exception 'FAIL: tournament_started deveria ser FALSE (só jogo futuro)';
  end if;
  raise notice 'PASS: torneio nao iniciado quando so ha jogo futuro';

  set local role authenticated;

  -- AC-7a: admin EDITA scoring_config antes do 1o jogo
  perform set_config('request.jwt.claims', json_build_object('sub', ad)::text, true);
  update public.scoring_config set points_winner_only = 3 where id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin deveria editar scoring_config antes do inicio (n=%)', n; end if;
  raise notice 'PASS: admin edita scoring_config antes do 1o jogo';

  -- AC-7b: jogador comum NAO edita scoring_config (0 linhas)
  perform set_config('request.jwt.claims', json_build_object('sub', p1)::text, true);
  update public.scoring_config set points_exact = 999 where id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: jogador NAO deveria editar scoring_config (n=%)', n; end if;
  raise notice 'PASS: jogador comum nao edita scoring_config';
end $$;
rollback;

-- ----------------------------------------------------------------------------
-- BLOCO 2 — Palpites (trava de kickoff, visibilidade, dono) + role + lock
-- ----------------------------------------------------------------------------
begin;
do $$
declare
  ad uuid := '33333333-3333-3333-3333-333333333333';
  p1 uuid := '11111111-1111-1111-1111-111111111111';
  p2 uuid := '22222222-2222-2222-2222-222222222222';
  n  integer;
begin
  -- setup (postgres / ignora RLS)
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000', ad, 'authenticated','authenticated',
          'ad@test.local','x', now(), now(), now(), '{}'::jsonb),
         ('00000000-0000-0000-0000-000000000000', p1, 'authenticated','authenticated',
          'p1@test.local','x', now(), now(), now(), '{}'::jsonb),
         ('00000000-0000-0000-0000-000000000000', p2, 'authenticated','authenticated',
          'p2@test.local','x', now(), now(), now(), '{}'::jsonb);
  update public.profiles set role = 'admin' where id = ad;

  insert into public.matches (id, stage, kickoff_at, status) values
    (9001, 'group', now() + interval '10 days', 'scheduled'),  -- ABERTO (futuro)
    (9002, 'group', now() - interval '1 day',  'finished');    -- TRAVADO (passado)

  -- palpites semeados (p2 no aberto e no travado; p1 no travado p/ teste de update)
  insert into public.predictions (user_id, match_id, home_score, away_score) values
    (p2, 9001, 1, 0),
    (p2, 9002, 2, 2),
    (p1, 9002, 0, 0);

  set local role authenticated;

  -- AC-4: dono INSERE seu palpite antes do apito (jogo aberto 9001)
  perform set_config('request.jwt.claims', json_build_object('sub', p1)::text, true);
  insert into public.predictions (user_id, match_id, home_score, away_score)
  values (p1, 9001, 3, 1);
  raise notice 'PASS: dono insere palpite antes do apito';

  -- AC-5: jogador NAO insere palpite com user_id de outro
  begin
    insert into public.predictions (user_id, match_id, home_score, away_score)
    values (p2, 9001, 9, 9);
    raise exception 'FAIL: jogador conseguiu inserir palpite para OUTRO usuario';
  exception when insufficient_privilege then
    raise notice 'PASS: jogador nao insere palpite de outro (RLS negou)';
  end;

  -- AC-4: jogador NAO insere apos o apito (jogo travado 9002)
  begin
    insert into public.predictions (user_id, match_id, home_score, away_score)
    values (p1, 9002, 1, 1)
    on conflict (user_id, match_id) do update set home_score = 1;  -- forca o caminho de escrita
    raise exception 'FAIL: jogador conseguiu palpitar/editar apos o apito';
  exception when insufficient_privilege then
    raise notice 'PASS: jogador nao palpita apos o apito (RLS negou)';
  end;

  -- AC-4: UPDATE de palpite apos o apito nao afeta nada (0 linhas)
  update public.predictions set home_score = 9 where user_id = p1 and match_id = 9002;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: UPDATE pos-apito afetou % linha(s)', n; end if;
  raise notice 'PASS: update de palpite apos o apito e bloqueado';

  -- AC-3: jogador NAO ve palpite de outro ANTES do apito (jogo aberto 9001)
  select count(*) into n from public.predictions where match_id = 9001 and user_id = p2;
  if n <> 0 then raise exception 'FAIL: jogador viu palpite alheio antes do apito (n=%)', n; end if;
  raise notice 'PASS: palpite alheio invisivel antes do apito';

  -- AC-3: jogador VE palpite de outro DEPOIS do apito (jogo travado 9002)
  select count(*) into n from public.predictions where match_id = 9002 and user_id = p2;
  if n <> 1 then raise exception 'FAIL: jogador NAO viu palpite alheio apos o apito (n=%)', n; end if;
  raise notice 'PASS: palpite alheio visivel apos o apito';

  -- dono sempre ve o proprio
  select count(*) into n from public.predictions where match_id = 9001 and user_id = p1;
  if n <> 1 then raise exception 'FAIL: dono nao viu o proprio palpite (n=%)', n; end if;
  raise notice 'PASS: dono ve o proprio palpite';

  -- AC-5: ADMIN NAO insere palpite no lugar de outro
  perform set_config('request.jwt.claims', json_build_object('sub', ad)::text, true);
  begin
    insert into public.predictions (user_id, match_id, home_score, away_score)
    values (p1, 9001, 5, 5)
    on conflict (user_id, match_id) do update set home_score = 5;
    raise exception 'FAIL: ADMIN conseguiu criar/editar palpite de outro usuario';
  exception when insufficient_privilege then
    raise notice 'PASS: admin nao cria/edita palpite alheio (RLS negou)';
  end;

  -- Anti-escalonamento: jogador NAO vira admin sozinho
  perform set_config('request.jwt.claims', json_build_object('sub', p1)::text, true);
  begin
    update public.profiles set role = 'admin' where id = p1;
    raise exception 'FAIL: jogador conseguiu se promover a admin';
  exception when raise_exception then
    raise notice 'PASS: jogador nao consegue mudar o proprio role';
  end;

  -- AC-7c: com torneio iniciado (jogo 9002 no passado), nem admin edita scoring_config
  if not public.tournament_started() then
    raise exception 'FAIL: tournament_started deveria ser TRUE (existe jogo passado)';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', ad)::text, true);
  update public.scoring_config set points_exact = 777 where id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: scoring_config editavel apos inicio do torneio (n=%)', n; end if;
  raise notice 'PASS: scoring_config travada apos o 1o jogo (nem admin edita)';

  raise notice '====================================';
  raise notice 'ALL CHECKS PASSED';
  raise notice '====================================';
end $$;
rollback;
