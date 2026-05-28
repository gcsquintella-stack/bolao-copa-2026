-- ============================================================================
-- Bolão Copa 2026 — Onboarding flag.
-- Marca se o usuário já passou pela tela de "escolher nome de exibição".
-- ============================================================================
alter table public.profiles
  add column if not exists onboarded boolean not null default false;

-- Permite o dono atualizar a coluna onboarded (RLS já restringe a linha ao dono).
grant update (onboarded) on public.profiles to authenticated;
