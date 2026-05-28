// De-para: casa nossos 104 jogos com os eventos da Copa 2026 na API da ESPN
// (por instante de kickoff + nomes dos times) e grava matches.espn_event_id.
// Rode: node --env-file=.env.local scripts/map-espn.mjs
import pg from "pg";

const SCOREBOARD = (yyyymmdd) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${yyyymmdd}`;

// ---- normalização de nomes de seleção -------------------------------------
const ALIAS = {
  czechia: "czechrepublic",
  korearepublic: "southkorea",
  turkiye: "turkey",
  cotedivoire: "ivorycoast",
  caboverde: "capeverde",
  unitedstates: "usa",
  us: "usa",
  iriran: "iran",
  congodr: "drcongo",
  democraticrepublicofcongo: "drcongo",
};
function norm(s) {
  if (!s) return "";
  let n = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z]/g, "");
  return ALIAS[n] ?? n;
}
const pairKey = (h, a) => [norm(h), norm(a)].sort().join("|");

// ---- busca ESPN ------------------------------------------------------------
function* dateRange(start, end) {
  const d = new Date(start);
  const last = new Date(end);
  while (d <= last) {
    yield `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

async function fetchEspn() {
  const days = [...dateRange("2026-06-10", "2026-07-20")]; // margem de 1 dia
  const byId = new Map();
  await Promise.all(
    days.map(async (d) => {
      try {
        const r = await fetch(SCOREBOARD(d));
        const j = await r.json();
        for (const e of j.events ?? []) {
          const comp = e.competitions?.[0];
          const cs = comp?.competitors ?? [];
          const home = cs.find((x) => x.homeAway === "home")?.team?.displayName;
          const away = cs.find((x) => x.homeAway === "away")?.team?.displayName;
          byId.set(e.id, {
            id: e.id,
            ms: new Date(e.date).getTime(),
            home,
            away,
            venue: comp?.venue?.fullName ?? null,
          });
        }
      } catch (err) {
        console.error("falha no dia", d, err.message);
      }
    }),
  );
  return [...byId.values()];
}

// ---- main ------------------------------------------------------------------
const client = new pg.Client({
  host: "aws-1-sa-east-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.lrjlhbjnggqqdbwxgnxv",
  database: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const { rows: ours } = await client.query(`
  select m.id, m.kickoff_at, m.stage,
         th.name as home_name, ta.name as away_name,
         m.home_label, m.away_label
  from public.matches m
  left join public.teams th on th.id = m.home_team_id
  left join public.teams ta on ta.id = m.away_team_id
  order by m.kickoff_at, m.id
`);

const espn = await fetchEspn();
console.log("Eventos ESPN coletados:", espn.length, "| Nossos jogos:", ours.length);

// índices por instante de kickoff
const espnByMs = new Map();
for (const e of espn) {
  if (!espnByMs.has(e.ms)) espnByMs.set(e.ms, []);
  espnByMs.get(e.ms).push(e);
}

const used = new Set();
const mapping = []; // {ourId, espnId}
const unmatched = [];

for (const m of ours) {
  const ms = new Date(m.kickoff_at).getTime();
  const candidates = (espnByMs.get(ms) ?? []).filter((e) => !used.has(e.id));
  let chosen = null;
  if (candidates.length === 1) {
    chosen = candidates[0];
  } else if (candidates.length > 1) {
    // desempata por par de times (fase de grupos)
    const want = pairKey(m.home_name, m.away_name);
    chosen = candidates.find((e) => pairKey(e.home, e.away) === want) ?? null;
  }
  if (chosen) {
    used.add(chosen.id);
    mapping.push({ ourId: m.id, espnId: chosen.id });
  } else {
    unmatched.push(m);
  }
}

// grava
for (const { ourId, espnId } of mapping) {
  await client.query("update public.matches set espn_event_id = $1 where id = $2", [espnId, ourId]);
}

// relatório
console.log(`\n✅ Mapeados: ${mapping.length}/${ours.length}`);
if (unmatched.length) {
  console.log(`\n⚠️ NÃO mapeados (${unmatched.length}):`);
  for (const m of unmatched) {
    const h = m.home_name ?? m.home_label;
    const a = m.away_name ?? m.away_label;
    console.log(`  #${m.id} ${m.stage} ${m.kickoff_at.toISOString?.() ?? m.kickoff_at} — ${h} x ${a}`);
  }
}
const espnUnused = espn.filter((e) => !used.has(e.id));
console.log(`\nEventos ESPN sem par: ${espnUnused.length}`);
for (const e of espnUnused.slice(0, 10))
  console.log(`  ESPN ${e.id} ${new Date(e.ms).toISOString()} — ${e.home} x ${e.away}`);

await client.end();
console.log("\nFim.");
