# Prompt para Claude Code — Plataforma de Bolão da Copa do Mundo 2026

> Cole este documento inteiro como a primeira mensagem em um projeto novo no Claude Code. Ele descreve **o que construir**, **como construir** e **como colocar no ar**, do zero até o deploy.

---

## 1. Objetivo

Construa uma plataforma web de **bolão (pool de palpites) para a Copa do Mundo FIFA 2026**, de qualidade profissional ("top of the line"), **gratuita de operar**, **mobile-first** e de **acesso fácil** (qualquer amigo entra por um link de convite e começa a palpitar em menos de um minuto).

Princípios que não podem ser violados:

- **Custo zero de operação.** Use exclusivamente tiers gratuitos (ver stack abaixo).
- **Integridade dos palpites é sagrada.** Ninguém pode ver o palpite de outra pessoa antes do jogo começar, ninguém pode editar palpite alheio, e nenhum palpite pode ser criado ou alterado depois do apito inicial. Isso precisa ser garantido **no banco de dados** (Row Level Security), não só na interface.
- **Apuração automática e auditável.** O ranking se atualiza sozinho assim que um resultado é lançado.

## 2. Pesquisa obrigatória ANTES de codar

Antes de escrever código, use a ferramenta de busca para validar e completar o seguinte. Resuma suas descobertas para mim e só então comece a implementar:

1. **Calendário e formato oficiais da Copa 2026.** A competição tem 48 seleções, 12 grupos de 4, 104 jogos, vai de 11/jun a 19/jul/2026, classificam os 2 primeiros de cada grupo + os 8 melhores terceiros, e há uma fase nova de "Round of 32" (dezesseis-avos) antes das oitavas. Confirme e obtenha a **tabela completa dos 104 jogos** (grupos, datas e horários — fixe o fuso de Brasília como padrão e guarde tudo em UTC no banco).
2. **Melhores práticas de bolão.** Pesquise como bolões bem administrados estruturam pontuação, anti-trapaça, prazos de palpite, bônus e retenção dos participantes ao longo de um torneio longo. Use isso para criticar e refinar o sistema de pontuação da Seção 5.
3. **Fonte de dados dos jogos/resultados.** Avalie APIs gratuitas de futebol com cobertura da Copa 2026 (ex.: football-data.org, API-Football via RapidAPI, TheSportsDB). Para cada uma verifique: cobre a Copa 2026? qual o limite do tier gratuito? exige cartão? Se nenhuma for confiável e gratuita o suficiente, adote o **fallback**: a fixture é semeada manualmente no banco (seed script) e os resultados são lançados por um **painel de administrador**. Decida e me justifique a escolha. Em qualquer cenário, mantenha o painel admin como mecanismo de fallback manual.

## 3. Stack técnica (tudo em tier gratuito)

- **Framework:** Next.js (App Router) + TypeScript.
- **UI:** Tailwind CSS + shadcn/ui. Visual polido, dark mode por padrão, responsivo de verdade (a maioria vai acessar pelo celular). Considere PWA (instalável, com ícone na home screen).
- **Backend + Banco + Auth + Realtime:** Supabase (Postgres, Supabase Auth, Realtime, Row Level Security). Tier gratuito.
- **Autenticação:** magic link por e-mail **e** login com Google (OAuth). Sem senha para o usuário final — acesso fácil. NÃO peça dados sensíveis.
- **Hospedagem/Deploy:** Vercel (Hobby tier, gratuito). Domínio `*.vercel.app` serve; deixe pronto para apontar um domínio próprio caso eu queira depois.
- **Versionamento:** Git desde o primeiro commit, com commits pequenos e descritivos por fase.

## 4. Modelo de dados (Postgres / Supabase)

Projete o schema com pelo menos estas entidades (ajuste nomes conforme convenção):

- `profiles` — id (FK auth.users), nome de exibição, avatar, papel (`player` | `admin`).
- `teams` — 48 seleções (nome, código, bandeira, grupo).
- `matches` — os 104 jogos: fase (`group` | `r32` | `r16` | `qf` | `sf` | `third` | `final`), grupo, time_casa, time_fora, data/hora (UTC), `kickoff_locked` (derivado), placar_casa, placar_fora (nulos até o resultado), status.
- `predictions` — palpite de um usuário para um jogo (placar_casa, placar_fora, timestamp de criação/edição). Único por (usuário, jogo).
- `bonus_predictions` — palpites especiais por usuário (campeão, vice, artilheiro, revelação, classificados de cada grupo).
- `scoring_config` — pontos e multiplicadores configuráveis; com flag de "travado" após o início do torneio.
- `results_log` — auditoria de quando cada resultado foi lançado e por quem.
- View/materialized view de **leaderboard** com pontuação total, por fase e histórico de posição por rodada.

**Row Level Security (CRÍTICO):**
- Um usuário só faz SELECT nos próprios `predictions` enquanto `now() < match.kickoff`. Depois do kickoff, os palpites daquele jogo ficam legíveis por todos (transparência) e **imutáveis**.
- INSERT/UPDATE de `predictions` só é permitido pelo dono **e** somente se `now() < match.kickoff`.
- `bonus_predictions` editáveis só até o apito do **jogo de abertura** (11/jun).
- Lançar resultados (`matches` placar) e editar `scoring_config`: só `admin`. Admin **não** pode criar nem editar palpites de ninguém.

## 5. Sistema de pontuação (valores sugeridos — todos configuráveis no painel admin, travados após o 1º jogo)

**Pontuação base por jogo (fase de grupos):**
- Placar exato ("cravada"): **10 pts**
- Acertou o vencedor **e** o saldo de gols (sem cravar): **7 pts**
- Acertou só o resultado (vencedor ou empate): **5 pts**
- Errou: **0 pts**

**Multiplicador por fase no mata-mata** (aplicado sobre a pontuação base do jogo, para manter o bolão competitivo até o fim e permitir viradas no ranking):
- Round of 32 (dezesseis-avos): **×1,5**
- Oitavas: **×2**
- Quartas: **×2,5**
- Semifinais + disputa de 3º lugar: **×3**
- Final: **×4**

**Palpites bônus** (definidos antes do torneio, travados no apito da abertura):
- Acertar os 2 classificados de um grupo: **+5 por grupo** (12 grupos)
- Acertar campeão: **+30** · Vice: **+15** · Artilheiro: **+15** · Seleção revelação: **+10**

**Regras gerais:**
- Vale o placar ao fim do **tempo normal** — prorrogação e pênaltis **não** contam.
- Pontuação **cumulativa** ao longo do torneio.
- A `scoring_config` deve ser editável livremente até o primeiro jogo e **bloqueada** automaticamente depois.

> Trate esses números como padrão. Implemente-os como configuração editável, e ajuste-os se sua pesquisa da Seção 2 indicar algo melhor — mas me explique qualquer mudança.

## 6. Funcionalidades

**Para o participante:**
- Onboarding em 1 minuto: abre o link de convite → login (Google ou magic link) → escolhe nome de exibição → cai na tela de palpites.
- Tela de palpites por jogo, com **filtros**: Hoje, Ao vivo, Abertos, Salvos, Encerrados, e busca por seleção.
- Cada jogo mostra **claramente o horário em que o palpite fecha**; após o apito o campo fica bloqueado e o palpite vira público.
- Tela de palpites bônus (campeão, vice, artilheiro, revelação, classificados de grupo) disponível só até a abertura.
- **Ranking ao vivo** (Supabase Realtime) com pontuação total, variação de posição e detalhamento por jogo/fase.
- Página de perfil com histórico de acertos e evolução de posição.
- Lembrete antes dos jogos (e-mail; ou pelo menos um aviso visual de "você tem N palpites em aberto fechando em breve").

**Para o admin (comissário do bolão):**
- Painel para **lançar resultados** (e recalcular pontuação automaticamente).
- Gerenciar participantes (aprovar entradas via link, conforme eu liberar).
- Definir/editar o sistema de pontuação **antes** do início.
- Gerar e revogar o **link de convite**.

**Qualidade ("top of the line"):**
- Mobile-first, dark mode, transições suaves, estados de loading e vazio bem feitos, acessível.
- Recálculo de pontuação idempotente e auditável (`results_log`).

## 7. Setup de ambiente e deploy — passo a passo operacional

Execute (e documente no README) nesta ordem. Onde uma ação depender de um painel externo (Supabase, Google Cloud, Vercel), **pare e me dê instruções claras do que clicar e quais valores copiar** — não invente credenciais nem crie contas por mim.

1. **Repositório:** inicialize o Git e crie o projeto: `npx create-next-app@latest` (TypeScript, App Router, Tailwind). Faça o primeiro commit.
2. **Dependências:** instale shadcn/ui, o client do Supabase (`@supabase/supabase-js` + helpers de SSR) e o que mais for necessário.
3. **Supabase:** me oriente a criar um projeto gratuito em supabase.com. Eu te passo a **Project URL** e a **anon key**; você as coloca em `.env.local` (e me lembra de nunca commitar esse arquivo — confirme o `.gitignore`).
4. **Schema:** escreva as migrations SQL (tabelas + policies de RLS da Seção 4) e me diga como rodá-las (via SQL editor do Supabase ou CLI).
5. **Auth:** configure magic link e Google OAuth. Para o Google, me dê o passo a passo de criar as credenciais OAuth no Google Cloud Console (tela de consentimento, client ID/secret, URIs de redirect) e onde colá-las no Supabase.
6. **Seed da fixture:** script que popula os 48 times, 12 grupos e os 104 jogos com datas/horários (da fonte validada na Seção 2).
7. **Rodar local:** `npm run dev`, e um checklist de teste (login, palpitar, trava no kickoff, lançar resultado como admin, ranking atualizando).
8. **Deploy na Vercel:** me oriente a conectar o repositório do GitHub à Vercel, configurar as **variáveis de ambiente** lá (as mesmas do `.env.local`), e fazer o deploy. Confirme que os URIs de redirect do OAuth incluem o domínio de produção.
9. **Checklist pré-Copa:** travar a `scoring_config`, validar a trava de palpites em produção, gerar o link de convite e me entregar um guia curto de "como administrar o bolão durante o torneio".

## 8. Como trabalhar

- Avance em fases, commitando ao final de cada uma: (1) scaffold + deploy "hello world" na Vercel para validar o pipeline cedo, (2) schema + RLS, (3) auth + onboarding, (4) palpites + trava de kickoff, (5) motor de pontuação + ranking realtime, (6) palpites bônus, (7) painel admin, (8) polish de UI, (9) seed + checklist pré-Copa.
- Mantenha um **README** com setup, decisões de arquitetura e o guia de administração.
- Sempre que precisar de uma ação minha em um serviço externo, pare e me instrua claramente. Nunca insira dados financeiros ou crie contas em meu nome.

---

**Resumo:** plataforma de bolão da Copa 2026, gratuita, mobile-first, com integridade garantida por RLS no Supabase, deploy na Vercel, e o sistema de pontuação da Seção 5 (validado pela sua pesquisa da Seção 2). Comece pela pesquisa, me apresente o plano, e então construa fase a fase.
