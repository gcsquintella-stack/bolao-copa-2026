// Resolvedor de times a partir da ESPN — fundação da apuração automática dos
// bônus (campeão/vice = vencedor da final; classificados = quem entra no
// mata-mata) e do chaveamento "de verdade" na /copa. A ESPN sabe quem joga cada
// partida; mapeamos pelo código FIFA (teams.code == espn competitor.abbreviation).
//
// Uso:
//   node --env-file=.env.local scripts/resolve-teams.mjs --verify [N]
//     -> NÃO grava. Confere a derivação contra N jogos de grupo já resolvidos.
//   node --env-file=.env.local scripts/resolve-teams.mjs --apply
//     -> grava home_team_id/away_team_id nos jogos de MATA-MATA ainda em aberto
//        (placeholders) e iminentes (próximos 7 dias) que a ESPN já definiu.
//        Idempotente: só toca jogos com time faltando. Rodado pelo cron.
import pg from "pg";

const SUM = (id) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${id}`;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const n = Number(args.find((a) => /^\d+$/.test(a)) ?? 12);

const client = new pg.Client({
  host: "aws-1-sa-east-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.lrjlhbjnggqqdbwxgnxv",
  database: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// mapa código FIFA -> nosso time
const { rows: teams } = await client.query(
  "select id, code, name from public.teams where code is not null",
);
const byCode = new Map(teams.map((t) => [t.code, t]));

// dado um evento ESPN, devolve { home, away } com nossos ids (ou id null se TBD)
async function espnTeams(eventId) {
  const j = await (await fetch(SUM(eventId))).json();
  const comps = j?.header?.competitions?.[0]?.competitors ?? [];
  const out = {};
  for (const c of comps) {
    const ours = byCode.get(c.team?.abbreviation);
    out[c.homeAway] = {
      id: ours?.id ?? null,
      name: ours?.name ?? null,
      abbr: c.team?.abbreviation,
    };
  }
  return out;
}

if (apply) {
  // jogos de mata-mata ainda sem time, iminentes (a ESPN só define perto da data)
  const { rows } = await client.query(`
    select id, espn_event_id, home_label, away_label
      from public.matches
     where stage <> 'group'
       and espn_event_id is not null
       and (home_team_id is null or away_team_id is null)
       and kickoff_at < now() + interval '7 days'
     order by kickoff_at
  `);
  console.log(`Mata-mata p/ resolver (próximos 7 dias, em aberto): ${rows.length}`);
  let resolved = 0;
  for (const r of rows) {
    const e = await espnTeams(r.espn_event_id);
    if (e.home?.id && e.away?.id) {
      await client.query(
        "update public.matches set home_team_id=$1, away_team_id=$2 where id=$3",
        [e.home.id, e.away.id, r.id],
      );
      resolved++;
      console.log(`  ✓ #${r.id}: ${e.home.name} x ${e.away.name}`);
    } else {
      console.log(
        `  · #${r.id}: ESPN ainda TBD (${e.home?.abbr ?? "?"}/${e.away?.abbr ?? "?"}) — pular`,
      );
    }
  }
  console.log(`\nResolvidos: ${resolved}/${rows.length}.`);
} else {
  // --verify: confere contra jogos de grupo já resolvidos (não grava)
  const { rows } = await client.query(
    `select m.id, m.espn_event_id, m.home_team_id, m.away_team_id,
            th.name home_name, ta.name away_name
       from public.matches m
       join public.teams th on th.id=m.home_team_id
       join public.teams ta on ta.id=m.away_team_id
      where m.stage='group' and m.espn_event_id is not null
      order by m.id limit $1`,
    [n],
  );
  let ok = 0;
  const bad = [];
  for (const r of rows) {
    const e = await espnTeams(r.espn_event_id);
    if (e.home?.id === r.home_team_id && e.away?.id === r.away_team_id) ok++;
    else
      bad.push(
        `#${r.id}: nosso ${r.home_name} x ${r.away_name} | ESPN ${e.home?.abbr}/${e.away?.abbr}`,
      );
  }
  console.log(`\nVERIFY: ${ok}/${rows.length} jogos resolvidos corretamente pela ESPN.`);
  if (bad.length) {
    console.log("Divergências:");
    for (const b of bad) console.log("  ", b);
  } else {
    console.log("✅ Todos bateram (times + orientação casa/fora).");
  }
}

await client.end();
