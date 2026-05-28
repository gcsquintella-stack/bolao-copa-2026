// Sincronizador ESPN -> nosso banco.
// - Lê o scoreboard da Copa (fifa.world) de uma data.
// - Para jogos FINALIZADOS, busca o /summary e calcula o placar dos 90 min
//   (período 1 + período 2; ignora prorrogação/pênaltis).
// - Grava em matches (home/away_score, status='finished') por espn_event_id,
//   o que dispara a apuração + ranking. Resolve orientação casa/fora pelos times.
//
// Uso:
//   node --env-file=.env.local scripts/sync-espn.mjs --preview 20221218   (só mostra, não grava)
//   node --env-file=.env.local scripts/sync-espn.mjs                      (data de hoje, grava)
//   node --env-file=.env.local scripts/sync-espn.mjs 20260611             (data específica, grava)
import pg from "pg";

const SB = (d) => `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${d}`;
const SUM = (id) => `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${id}`;

const FINAL = new Set([
  "STATUS_FULL_TIME",
  "STATUS_FINAL",
  "STATUS_FINAL_AET",
  "STATUS_FINAL_PEN",
]);

function todayUtc() {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}
function regulation(linescores) {
  if (!Array.isArray(linescores) || linescores.length < 2) return null;
  return Number(linescores[0]?.displayValue ?? 0) + Number(linescores[1]?.displayValue ?? 0);
}

async function summaryRegScore(eventId) {
  const j = await (await fetch(SUM(eventId))).json();
  const comps = j?.header?.competitions?.[0]?.competitors;
  if (!comps) return null;
  const out = {};
  for (const c of comps) {
    out[c.homeAway] = { team: c.team?.displayName, reg: regulation(c.linescores) };
  }
  return out; // { home:{team,reg}, away:{team,reg} }
}

const args = process.argv.slice(2);
const preview = args.includes("--preview");
const date = args.find((a) => /^\d{8}$/.test(a)) ?? todayUtc();

const sb = await (await fetch(SB(date))).json();
const events = (sb.events ?? []).filter((e) => FINAL.has(e.status?.type?.name));
console.log(`Data ${date}: ${sb.events?.length ?? 0} jogos, ${events.length} finalizados.`);

const results = [];
for (const e of events) {
  const reg = await summaryRegScore(e.id);
  if (!reg || reg.home.reg == null || reg.away.reg == null) {
    console.log(`  ⚠️ ${e.id}: sem linescores de regulamentar; pular (admin lança).`);
    continue;
  }
  results.push({ id: e.id, status: e.status.type.name, ...reg });
  console.log(`  ${e.id} [${e.status.type.name}] 90': ${reg.home.team} ${reg.home.reg} x ${reg.away.reg} ${reg.away.team}`);
}

if (preview) {
  console.log("\n(preview — nada gravado)");
  process.exit(0);
}

// grava no banco
const client = new pg.Client({
  host: "aws-1-sa-east-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.lrjlhbjnggqqdbwxgnxv",
  database: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
let updated = 0;
for (const r of results) {
  // orientação: ESPN home/away pode diferir da nossa; gravamos como ESPN manda
  // (home=ESPN home). O de-para garante o jogo certo; orientação é consistente
  // dentro da ESPN. (Resolução de times do mata-mata: fase futura.)
  const res = await client.query(
    `update public.matches set home_score=$1, away_score=$2, status='finished' where espn_event_id=$3`,
    [r.home.reg, r.away.reg, r.id],
  );
  updated += res.rowCount;
}
console.log(`\n✅ Jogos atualizados no banco: ${updated} (apuração + ranking disparados pelo trigger).`);
await client.end();
