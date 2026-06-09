# Handoff — Bolão Copa 2026 (S.M.M.A)

> Onde paramos, como rodar e o que falta. Atualizado em 2026-06-09.

## O que é
Plataforma web de bolão da Copa do Mundo 2026 entre amigos (grupo **S.M.M.A**), valendo dinheiro. Mobile-first, **light / off-white + azul (Direção D)**, custo zero, integridade dos palpites garantida por RLS.

- **Produção:** https://bolao-copa-2026-theta-kohl.vercel.app
- **Repo:** https://github.com/gcsquintella-stack/bolao-copa-2026 (branch `main`, deploy automático na Vercel a cada push)
- **Stack:** Next.js 16 (App Router) + TS · Tailwind v4 + shadcn (Base UI) · Supabase (Postgres+Auth+Realtime+RLS) · Vercel · fonte de resultados = **API pública da ESPN**.

## Estado atual (fases)
- ✅ **1–7** scaffold/deploy · schema+RLS · auth (magic link **+ Google OAuth ATIVO em prod**) · 104 jogos + palpites + trava · pontuação automática + ranking ao vivo · bônus (jogador) + apuração/revelação · painel admin.
- 🔧 **8** motor de resultados ESPN **pronto e provado** (de-para 104/104, sync extrai 90 min) — **falta só agendar (cron) + segredo de escrita** (ver "Próximos passos").
- ✅ **9 — Identidade visual (Direção D), COMPLETA:** light/off-white + azul, fontes Inter+Fraunces, **bandeiras circulares** (circle-flags em `public/flags/`), **nomes PT-BR** (migration 0010), ranking com **pódio**, **pontos no card** (encerrado + ao vivo + multiplicador de mata-mata), **realtime na /jogos**, bônus com **dropdown de bandeiras** (Base UI Select), login, **shell responsivo** (top nav web-native — sem chrome de app), **motion** (confete na cravada / count-up / entrada escalonada; respeita reduced-motion).
- ✅ **Página de Regras** (`/regras`, **aba no nav** + pública) · **Hub da Copa** (`/copa`: abas **Grupos** [classificação calculada] + **Mata-mata** [chaveamento com placeholders humanizados]).
- ⚠️ **Tudo de 9 + Regras + Copa está em BRANCH, não em produção** — ver "Próximos passos".

## Como rodar / desenvolver (Windows, sem admin)
- Node é **portátil** em `%LOCALAPPDATA%\nodejs` (sem admin). Em terminal novo já está no PATH; em sessões antigas, prefixe `$env:Path = "$env:LOCALAPPDATA\nodejs;$env:Path"`.
- `npm run dev` / `npm run build`. Preview do Claude via `.claude/dev.cmd` (injeta o PATH); `.claude/` é gitignored.
- **Aplicar SQL direto no banco** (sem copia-cola): `node --env-file=.env.local scripts/db.mjs <arquivo.sql | --sql "...">`. Usa `SUPABASE_DB_PASSWORD` do `.env.local` (Session pooler).
- **Sincronizar resultados da ESPN:** `node --env-file=.env.local scripts/sync-espn.mjs --preview AAAAMMDD` (só mostra) ou sem `--preview` (grava).
- **Segredos (só em `.env.local`, gitignored):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable), `SUPABASE_DB_PASSWORD`. A ESPN não usa chave. `API_FOOTBALL_KEY` existe no arquivo mas **a API-Football foi abandonada** (suspendeu a conta) — pode ignorar/remover.

## Decisões travadas
- **Pontuação por jogo (90 min):** cravada **10** · vencedor+saldo **6** · só resultado **3** · erro **0**.
- **Multiplicadores mata-mata:** R32 ×1,5 · oitavas ×2 · quartas ×2,5 · semis+3º ×3 · final ×4.
- **Bônus ("Enxuto", calibrado por simulação — ~5% do total, critério de desempate):** campeão **12** · vice **6** · artilheiro **6** · revelação **4** · classificado de grupo **+1** (cada). Travam no apito da abertura. Editáveis no admin até o 1º jogo.
- **Revelação (automática):** seleção **fora do top 20 FIFA** (rank 21+) que chega mais longe; piso nos 16-avos; empate → **pontos → saldo → gols → pior ranking FIFA** (decisor único). `teams.fifa_rank` semeado (1/abr/2026).
- **Classificados de grupo:** conta o par (sem ordem). **Artilheiro:** texto por enquanto (picklist de jogadores é follow-up #16).
- **Fonte de resultados:** ESPN (`site.api.espn.com/.../soccer/fifa.world/scoreboard` e `/summary`). 90 min = períodos 1+2 do `/summary`. Não-oficial → admin é autoridade final.

## Próximos passos (RETOMAR DAQUI — em ordem)
> **⚠️ Trabalho desta sessão (Fase 9 + Regras + Copa) está na branch `feat/visual-fase9-regras-copa`, COMMITADO mas NÃO pushado.** Limpeza já feita (styleguide `/design` removido, proxy revertido — só `/regras` ficou público permanente). `next build` / lint / tsc **verdes** = deploy-ready. Pra continuar: `git checkout feat/visual-fase9-regras-copa`.

1. **Deploy:** revisar a branch → merge em `main` → **push** (Vercel deploya). Depois **smoke test** em produção: criar usuário, palpitar, lançar placar fake no admin, ver pontos no card + ranking + /copa atualizarem (e ver confete/count-up ao vivo). Reverter o placar fake.
2. **#14 cron ESPN + segredo de escrita** (LAUNCH-CRITICAL, antes de 11/jun): agendar `scripts/sync-espn.mjs`. Recomendado: **GitHub Actions cron** (~a cada 5-10 min; segredo `SUPABASE_DB_PASSWORD` nos GH Secrets) — reusa o script já provado. Alternativa: Supabase Edge Function + pg_cron (frequência maior, mais setup). ESPN é sem chave. **Guiar o usuário click-by-click no painel.**
3. **Hardening / "bulletproof":** backup periódico dos palpites; **ensaio geral** (rodar o sync de um jogo passado em prod → pontuação → ranking, ao vivo); alerta simples se o sync falhar. Risco real = **integridade/recuperação**, NÃO carga (são ~15 amigos). Admin é a rede de segurança (corrige placar na mão; re-scoring é idempotente).
4. **Analytics — breakdown no ranking** (código solo): expandir a linha do jogador → ver jogo a jogo (palpite × resultado × pontos) + bônus + nº de cravadas. **Respeita RLS** (só mostra palpites de jogos já travados/encerrados). Dados já existem (`predictions.points`).
5. **#15** admin lançar respostas oficiais dos bônus + rodar `score_bonus()` · **#16** picklist do artilheiro (quando saírem as convocações).

**Adiados (sem prejuízo):** PWA · #12 variação ↑↓ no ranking (precisa snapshots) · #13 convite/aprovação de participantes (hoje signup aberto) · 🔐 resetar senha do banco (**decisão do usuário: NÃO mexer agora**).

## Gotchas do Next 16 / stack
- Middleware agora é **`proxy.ts`** (função `proxy`). `cookies()` é **assíncrono**.
- shadcn aqui é **Base UI**: `Button` usa prop **`render`** (não `asChild`). Select custom usa `@base-ui/react/select` (ver `bonus-form.tsx`).
- ✅ Bandeiras resolvidas: **circle-flags** (SVG circular em `public/flags/`), componente `<Flag code>` em `components/ui/flag.tsx`, de-para FIFA→ISO em `src/lib/flags.ts`. (Emoji de bandeira quebra no Windows — não usar.)
- **Fontes (Direção D):** Inter (sans) + Fraunces (serif → use `font-serif`/`font-heading`). **GOTCHA:** `@theme inline --font-sans: var(--font-inter)` NÃO gera a utility aqui (cai em Times New Roman) → fontes bindadas **direto** no `globals.css` (`html{font-family:var(--font-inter)…}` + classes sem-layer `.font-serif`/`.font-heading`).
- **Helpers novos:** `lib/time.ts` (leituras de tempo FORA do render — regra `react-hooks/purity`), `lib/scoring.ts` (espelho TS do motor `0006`, p/ pontos no card), `lib/standings.ts` (classificação), `components/realtime-refresher.tsx` (compartilhado ranking+jogos), `components/count-up.tsx`.
- **Lint estrito:** regras `react-hooks/purity` (proíbe `Date.now()`/`new Date()` no render) e `set-state-in-effect` ativas. Mantém **lint 0 / tsc 0**.
- **QA visual:** o styleguide `/design` foi **removido** (era TEMP). Pra QA de UI nova: recriar rota `/design/*` temporária (liberar no `proxy.ts` isPublic, e **remover antes do commit**). O preview do Claude **trava a captura** quando o renderer satura → reiniciar o preview server resolve. Páginas autenticadas: criar styleguide mock dos componentes reais.
- **Migrations** em `supabase/migrations/` (0001→**0010**; 0010 = nomes PT-BR, aplicado). Testes em `supabase/tests/`. Seed em `supabase/seed-data/`. Mata-mata no seed usa placeholders `2A`/`1C`/`3A/B/..`/`W73`/`L101`.
- Dep nova: **`canvas-confetti`** (confete na cravada, import dinâmico).
