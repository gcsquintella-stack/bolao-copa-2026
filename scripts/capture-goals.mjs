// Captura os autores dos gols de cada jogo FINALIZADO a partir da ESPN
// (keyEvents) e grava em match_goals — base do bônus de artilheiro automático.
// Conta gols de jogo (incl. pênalti em jogo); ignora disputa de pênaltis
// (shootout). Marca gol contra (não conta p/ artilheiro). Idempotente: apaga e
// regrava os gols de cada jogo. Rodado pelo cron.
//
// Uso: node --env-file=.env.local scripts/capture-goals.mjs [--event ESPNID]
//   --event: captura SÓ esse evento, no jogo cujo espn_event_id bate (p/ teste).
import pg from "pg";

const SUM = (id) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${id}`;

const args = process.argv.slice(2);
const onlyEvent = args.includes("--event")
  ? args[args.indexOf("--event") + 1]
  : null;

const client = new pg.Client({
  host: "aws-1-sa-east-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.lrjlhbjnggqqdbwxgnxv",
  database: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// extrai gols de um /summary: scoringPlay verdadeiro e fora da disputa de pênaltis
function goalsFromSummary(j) {
  const out = [];
  for (const e of j?.keyEvents ?? []) {
    if (!e.scoringPlay || e.shootout) continue;
    const txt = `${e.type?.text ?? ""} ${e.text ?? ""}`;
    const scorer =
      (e.participants ?? e.athletesInvolved ?? [])[0]?.athlete?.displayName ??
      (e.participants ?? [])[0]?.displayName ??
      null;
    if (!scorer) continue;
    out.push({
      scorer,
      team_code: e.team?.abbreviation ?? null,
      minute: e.clock?.displayValue ?? null,
      own_goal: /own goal/i.test(txt),
      penalty: /penalt/i.test(txt),
    });
  }
  return out;
}

const { rows } = await client.query(
  `select id, espn_event_id from public.matches
    where status='finished' and espn_event_id is not null
      ${onlyEvent ? "and espn_event_id = $1" : ""}`,
  onlyEvent ? [onlyEvent] : [],
);

let totalGoals = 0;
for (const m of rows) {
  const j = await (await fetch(SUM(m.espn_event_id))).json();
  const goals = goalsFromSummary(j);
  await client.query("delete from public.match_goals where match_id=$1", [m.id]);
  for (const g of goals) {
    await client.query(
      `insert into public.match_goals (match_id, scorer, team_code, minute, own_goal, penalty)
       values ($1,$2,$3,$4,$5,$6)`,
      [m.id, g.scorer, g.team_code, g.minute, g.own_goal, g.penalty],
    );
  }
  totalGoals += goals.length;
  if (goals.length)
    console.log(
      `  #${m.id} (espn ${m.espn_event_id}): ${goals.length} gol(s) — ${goals
        .map((g) => g.scorer + (g.own_goal ? " (GC)" : ""))
        .join(", ")}`,
    );
}
console.log(`\n✅ Jogos: ${rows.length} | gols capturados: ${totalGoals}.`);
await client.end();
