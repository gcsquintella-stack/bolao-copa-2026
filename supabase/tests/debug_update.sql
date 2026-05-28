-- Diagnóstico do UPDATE de palpite (jogo aberto, como usuário comum).
-- Força o resultado a aparecer como MENSAGEM de erro (visível no editor) e
-- desfaz tudo (a própria exceção causa rollback). NÃO grava nada.
do $$
declare
  p1 uuid := '11111111-1111-1111-1111-111111111111';
  n integer;
  result text;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000', p1, 'authenticated','authenticated',
          'p1@test.local','x', now(), now(), now(), '{}'::jsonb);

  insert into public.matches (id, stage, kickoff_at, status)
  values (9001, 'group', now() + interval '10 days', 'scheduled');

  insert into public.predictions (user_id, match_id, home_score, away_score)
  values (p1, 9001, 0, 0);

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p1)::text, true);

  begin
    update public.predictions set home_score = 1, away_score = 0
    where user_id = p1 and match_id = 9001;
    get diagnostics n = row_count;
    result := 'UPDATE OK, linhas afetadas = ' || n;
  exception when others then
    result := 'UPDATE FALHOU: sqlstate=' || sqlstate || ' | msg=' || sqlerrm;
  end;

  raise exception 'DIAGNOSTICO >>> %', result;
end $$;
