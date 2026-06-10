// Resolvedor de times a partir da ESPN — fundação da apuração automática dos
// bônus (campeão/vice = vencedor da final; classificados = quem entra no
// mata-mata). A ESPN sabe quem joga cada partida; mapeamos pelo código FIFA
// (teams.code == espn competitor.team.abbreviation).
//
// Uso:
//   node --env-file=.env.local scripts/resolve-teams.mjs --verify [N]
//     -> NÃO grava. Pega N jogos de grupo (já resolvidos) e confere que a
//        derivação da ESPN bate com os times que já temos. Prova de correção.
//   node --env-file=.env.local scripts/resolve-teams.mjs --apply
//     -> grava home_team_id/away_team_id nos jogos de mata-mata ainda em aberto
//        (placeholders) cujos times a ESPN já definiu. (peça 2 — não usado ainda)
import pg from "pg";

const SUM = (id) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${id}`;

const args = process.argv.slice(2);
const verify = args.includes("--verify") || !args.includes("--apply");
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

// dado um evento ESPN, devolve { home: teamId, away: teamId } pelos nossos ids
async function espnTeams(eventId) {
  const j = await (await fetch(SUM(eventId))).json();
  const comps = j?.header?.competitions?.[0]?.competitors ?? [];
  const out = {};
  for (const c of comps) {
    const ours = byCode.get(c.team?.abbreviation);
    out[c.homeAway] = ours
      ? { id: ours.id, name: ours.name, abbr: c.team?.abbreviation }
      : { id: null, name: null, abbr: c.team?.abbreviation };
  }
  return out;
}

if (verify) {
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
    const homeOk = e.home?.id === r.home_team_id;
    const awayOk = e.away?.id === r.away_team_id;
    if (homeOk && awayOk) ok++;
    else
      bad.push(
        `#${r.id}: nosso ${r.home_name} x ${r.away_name} | ESPN ${e.home?.abbr}/${e.away?.abbr} (home_id ${e.home?.id} vs ${r.home_team_id})`,
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
