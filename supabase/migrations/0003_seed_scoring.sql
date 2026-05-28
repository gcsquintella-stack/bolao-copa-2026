-- ============================================================================
-- Bolão Copa 2026 — Seed da configuração de pontuação (singleton).
-- Valores acordados: 10/6/3/0 + multiplicadores mata-mata + bônus.
-- Editável no painel admin até o apito do 1º jogo (depois trava por RLS).
-- (A fixture — 48 times, 12 grupos, 104 jogos — é semeada na Fase 9.)
-- ============================================================================

insert into public.scoring_config (id) values (true)
on conflict (id) do nothing;

insert into public.tournament_outcome (id) values (true)
on conflict (id) do nothing;
