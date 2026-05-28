-- ============================================================================
-- Bolão Copa 2026 — Mapeamento com a API pública da ESPN.
-- Guarda o id do evento da ESPN em cada jogo, para o sincronizador casar
-- nossos 104 jogos com os placares de lá.
-- ============================================================================
alter table public.matches
  add column if not exists espn_event_id text;

create index if not exists matches_espn_idx on public.matches (espn_event_id);
