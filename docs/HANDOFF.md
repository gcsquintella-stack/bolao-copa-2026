# Handoff — Bolão Copa 2026 (S.M.M.A)

> Onde paramos, como rodar e o que falta. Atualizado em 2026-05-28.

## O que é
Plataforma web de bolão da Copa do Mundo 2026 entre amigos (grupo **S.M.M.A**), valendo dinheiro. Mobile-first, dark mode, custo zero, integridade dos palpites garantida por RLS.

- **Produção:** https://bolao-copa-2026-theta-kohl.vercel.app
- **Repo:** https://github.com/gcsquintella-stack/bolao-copa-2026 (branch `main`, deploy automático na Vercel a cada push)
- **Stack:** Next.js 16 (App Router) + TS · Tailwind v4 + shadcn (Base UI) · Supabase (Postgres+Auth+Realtime+RLS) · Vercel · fonte de resultados = **API pública da ESPN**.

## Estado atual (fases)
- ✅ **1** scaffold + deploy · **2** schema + RLS (provado) · **3** auth magic link + onboarding · **4** 104 jogos + tela de palpites + trava no apito · **5** pontuação automática + ranking ao vivo · **6** palpites bônus (jogador) + apuração/revelação (provado) · **7** painel admin (resultados + pontuação).
- 🔧 **8** motor de resultados ESPN **pronto e provado** (de-para 104/104, sync extrai 90 min) — **falta só agendar (cron) + segredo de escrita em produção**.

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

## Pendências (retomar daqui)
- **Operacional p/ a Copa (perto de junho):** #14 agendar o sync (cron — Supabase Edge Function+pg_cron, GitHub Actions, ou cron externo) + segredo de escrita em prod (service key OU connection string) · #15 admin lançar respostas oficiais dos bônus + rodar `score_bonus()` · #16 picklist do artilheiro (quando saírem as convocações).
- **Fase 9 — acabamento:** #11 bandeiras como imagem (emoji vira código de 2 letras no Windows) + nomes em PT-BR · PWA · checklist pré-Copa · guia de admin no README.
- **Adiados por decisão do usuário:** login Google (estrutura pronta, botão dormindo) · #12 variação ↑↓ no ranking (precisa snapshots) · #13 convite/aprovação de participantes (hoje signup é aberto).
- 🔐 **Resetar a senha do banco** antes do lançamento (passou pelo chat durante o setup).

## Gotchas do Next 16 / stack
- Middleware agora é **`proxy.ts`** (função `proxy`). `cookies()` é **assíncrono**.
- shadcn aqui é **Base UI**: `Button` usa prop **`render`** (não `asChild`).
- Emoji de bandeira **não renderiza no Windows** (mostra 2 letras) — usar imagem (#11).
- Migrations em `supabase/migrations/` (0001→0009). Testes em `supabase/tests/` (rollback, mostram "OK >>>" via exceção proposital). Dados de seed em `supabase/seed-data/`.
