-- 0013_sync_cron.sql
-- Gatilho AUTOMÁTICO e *windowed* do sync da ESPN, dentro do Postgres
-- (pg_cron + pg_net). Substitui a dependência do `schedule` do GitHub Actions,
-- que em produção disparou a cada 2-6h em vez de 10 min (placares atrasando).
--
-- A cada 3 min o "gate" verifica se há jogo em janela [kickoff-5min, kickoff+3h];
-- se houver, chama a API workflow_dispatch do GitHub (token no Supabase Vault)
-- para rodar o workflow sync-espn. Fora de janela: apenas um EXISTS indexado,
-- nenhuma chamada externa, nenhum trabalho. Janela de 3h cobre 90 min + intervalo
-- + acréscimos com folga (ignoramos prorrogacao/penaltis de qualquer forma).
--
-- O segredo `github_dispatch_token` (PAT fine-grained, Actions:write, 1 repo) é
-- criado FORA desta migration via vault.create_secret (nao versionar segredo).

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_sync_if_live()
returns void
language plpgsql
set search_path = ''
as $func$
declare
  tok text;
begin
  -- Gate: so prossegue se houver jogo em janela ativa.
  if not exists (
    select 1 from public.matches
    where now() >= kickoff_at - interval '5 minutes'
      and now() <  kickoff_at + interval '3 hours'
  ) then
    return;
  end if;

  select decrypted_secret into tok
  from vault.decrypted_secrets
  where name = 'github_dispatch_token';

  if tok is null then
    raise warning 'trigger_sync_if_live: segredo github_dispatch_token ausente no Vault';
    return;
  end if;

  perform net.http_post(
    url     := 'https://api.github.com/repos/gcsquintella-stack/bolao-copa-2026/actions/workflows/sync-espn.yml/dispatches',
    body    := jsonb_build_object('ref', 'main'),
    headers := jsonb_build_object(
      'Authorization',        'Bearer ' || tok,
      'Accept',               'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent',           'bolao-sync',
      'Content-Type',         'application/json'
    )
  );
end
$func$;

-- PostgREST expoe funcoes do schema public como RPC. Esta nao deve ser chamavel
-- por anon/authenticated: so o postgres (via cron) a aciona.
revoke all on function public.trigger_sync_if_live() from public;

-- Agendamento: a cada 3 min. cron.schedule faz upsert pelo jobname (idempotente).
select cron.schedule(
  'bolao-sync-gate',
  '*/3 * * * *',
  $cmd$select public.trigger_sync_if_live();$cmd$
);
