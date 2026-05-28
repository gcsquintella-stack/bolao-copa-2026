# S.M.M.A — Bolão Copa do Mundo 2026

Plataforma web do bolão da Copa do Mundo FIFA 2026 entre amigos (grupo **S.M.M.A**). Mobile-first, dark mode, custo zero de operação, com integridade dos palpites garantida no banco de dados.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Base UI) — dark mode por padrão via `next-themes`
- **Supabase** (Postgres + Auth + Realtime + Row Level Security) — _a configurar na Fase 2_
- **Vercel** (Hobby) para deploy — _a configurar na Fase 1_
- **API-Football** (api-sports.io, tier free) para apuração automática de resultados — _Fase 8_

## Rodar localmente

> Node.js está instalado de forma portátil em `%LOCALAPPDATA%\nodejs` (sem admin). Após reabrir o terminal, `node` e `npm` ficam no PATH automaticamente.

```bash
npm install      # instala dependências em ./node_modules (isolado por projeto)
npm run dev      # http://localhost:3000
npm run build    # build de produção (mesmo que a Vercel roda)
```

Variáveis de ambiente ficam em `.env.local` (NUNCA commitado — veja `.gitignore`). As chaves do Supabase entram na Fase 2.

## Decisões de produto (resumo)

- **Pontuação base** (editável no admin, trava após o 1º jogo): cravada **10** · vencedor+saldo **6** · só resultado **3** · erro **0**.
- **Multiplicadores mata-mata**: R32 ×1,5 · oitavas ×2 · quartas ×2,5 · semis+3º ×3 · final ×4.
- **Bônus** (travam no apito da abertura; calibrados via simulação p/ serem critério de desempate, não fator decisório — ~5% do total): classificado de grupo **+1** cada · campeão **+12** · vice **+6** · artilheiro **+6** · revelação **+4**.
- Vale o **placar dos 90 minutos** (prorrogação e pênaltis não contam).
- **Integridade**: palpite oculto até o kickoff, imutável depois, garantido por RLS no Postgres. Admin não cria nem edita palpite de ninguém.

## Estrutura

```
src/
  app/            # rotas (App Router)
  components/     # componentes (ui/ = shadcn)
  lib/            # utilitários
docs/             # brief original do projeto
```

## Fases de construção

1. ✅ Scaffold + deploy "hello world" na Vercel
2. Schema + RLS (Supabase)
3. Auth (magic link + Google) + onboarding
4. Palpites + trava de kickoff
5. Motor de pontuação + ranking realtime
6. Palpites bônus
7. Painel admin
8. Integração API-Football (apuração automática + analytics)
9. Polish UI + seed dos 104 jogos + checklist pré-Copa
