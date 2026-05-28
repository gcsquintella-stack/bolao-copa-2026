// Transforma os dados da openfootball (worldcup.json + worldcup.teams.json) em
// SQL de seed (../migrations/0005_seed_fixture.sql), convertendo horários para UTC
// e validando contagens + cruzando os grupos com a fixturedownload.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(readFileSync(join(here, f), "utf8"));

const wc = read("worldcup.json");
const teamsRaw = read("worldcup.teams.json");
const fd = read("fixturedownload.json");

// ---- helpers ----------------------------------------------------------------
const esc = (s) => (s == null ? null : String(s).replace(/'/g, "''"));
const q = (s) => (s == null ? "null" : `'${esc(s)}'`);

function toUtcIso(date, time) {
  const m = time.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})$/);
  if (!m) throw new Error(`time inválido: "${time}"`);
  const [, hh, mm, off] = m;
  const offset = parseInt(off, 10); // ex.: -6
  const [y, mo, d] = date.split("-").map(Number);
  // hora "de parede" tratada como UTC, depois subtrai o offset p/ obter UTC real
  const ms = Date.UTC(y, mo - 1, d, Number(hh), Number(mm)) - offset * 3600_000;
  return new Date(ms).toISOString().replace(".000Z", "Z");
}

const STAGE = {
  "Round of 32": "r32",
  "Round of 16": "r16",
  "Quarter-final": "qf",
  "Semi-final": "sf",
  "Match for third place": "third",
  Final: "final",
};
function stageOf(round, group) {
  if (group) return "group";
  if (STAGE[round]) return STAGE[round];
  if (/^Matchday/.test(round)) return "group";
  throw new Error(`round desconhecido: "${round}"`);
}

// nome -> código FIFA (inclui name_normalised)
const codeByName = new Map();
for (const t of teamsRaw) {
  codeByName.set(t.name, t.fifa_code);
  if (t.name_normalised) codeByName.set(t.name_normalised, t.fifa_code);
}

// ---- teams ------------------------------------------------------------------
const groups = {};
for (const t of teamsRaw) (groups[t.group] ??= []).push(t.name);
const groupLetters = Object.keys(groups).sort();

// ---- matches ----------------------------------------------------------------
const matches = wc.matches.map((m) => {
  const groupLetter = m.group ? m.group.replace("Group ", "") : null;
  const stage = stageOf(m.round, m.group);
  const homeCode = codeByName.get(m.team1) ?? null;
  const awayCode = codeByName.get(m.team2) ?? null;
  return {
    stage,
    groupLetter,
    homeCode,
    awayCode,
    homeLabel: homeCode ? null : m.team1, // placeholder de chave
    awayLabel: awayCode ? null : m.team2,
    kickoff: toUtcIso(m.date, m.time),
    venue: m.ground,
  };
});
// id por ordem cronológica (kickoff, depois stage)
const stageOrder = ["group", "r32", "r16", "qf", "sf", "third", "final"];
matches.sort(
  (a, b) =>
    a.kickoff.localeCompare(b.kickoff) ||
    stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage),
);
matches.forEach((m, i) => (m.id = i + 1));

// ---- validações -------------------------------------------------------------
const errors = [];
if (teamsRaw.length !== 48) errors.push(`esperava 48 times, achei ${teamsRaw.length}`);
if (groupLetters.length !== 12) errors.push(`esperava 12 grupos, achei ${groupLetters.length}`);
for (const g of groupLetters)
  if (groups[g].length !== 4) errors.push(`grupo ${g} tem ${groups[g].length} times`);
if (matches.length !== 104) errors.push(`esperava 104 jogos, achei ${matches.length}`);

const byStage = {};
for (const m of matches) byStage[m.stage] = (byStage[m.stage] ?? 0) + 1;
const expectStage = { group: 72, r32: 16, r16: 8, qf: 4, sf: 2, third: 1, final: 1 };
for (const [s, n] of Object.entries(expectStage))
  if (byStage[s] !== n) errors.push(`stage ${s}: esperava ${n}, achei ${byStage[s] ?? 0}`);

// times de grupo sem código (não bateu o nome)
for (const m of matches)
  if (m.stage === "group" && (!m.homeCode || !m.awayCode))
    errors.push(`jogo de grupo sem código: ${m.homeLabel ?? ""} x ${m.awayLabel ?? ""}`);

// ---- cross-check com fixturedownload (membros de cada grupo) -----------------
const norm = (s) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
const ofGroups = {}; // openfootball
for (const t of teamsRaw) (ofGroups[t.group] ??= new Set()).add(norm(t.name_normalised ?? t.name));
const fdGroups = {};
for (const m of fd) {
  if (!m.Group) continue;
  const g = m.Group.replace("Group ", "");
  (fdGroups[g] ??= new Set()).add(norm(m.HomeTeam));
  fdGroups[g].add(norm(m.AwayTeam));
}
const crossMismatch = [];
for (const g of groupLetters) {
  const a = ofGroups[g] ?? new Set();
  const b = fdGroups[g] ?? new Set();
  const diff = [...a].filter((x) => !b.has(x));
  if (diff.length) crossMismatch.push(`Grupo ${g}: openfootball tem [${diff.join(", ")}] que não bateram na fixturedownload`);
}

// ---- gera SQL ---------------------------------------------------------------
let sql = `-- ============================================================================
-- Bolão Copa 2026 — Seed da fixture (48 seleções, 12 grupos, 104 jogos).
-- Gerado por supabase/seed-data/build-seed.mjs a partir da openfootball.
-- Horários convertidos de (local + offset) para UTC. Mata-mata com placeholders.
-- Re-executável: limpa matches/teams antes de inserir.
-- ============================================================================
delete from public.matches;
delete from public.teams;

insert into public.teams (name, code, flag, group_label) values
`;
sql += teamsRaw
  .map((t) => `  (${q(t.name)}, ${q(t.fifa_code)}, ${q(t.flag_icon)}, ${q(t.group)})`)
  .join(",\n");
sql += ";\n\ninsert into public.matches (id, stage, group_label, home_team_id, away_team_id, home_label, away_label, kickoff_at, venue) values\n";
sql += matches
  .map((m) => {
    const home = m.homeCode
      ? `(select id from public.teams where code='${m.homeCode}')`
      : "null";
    const away = m.awayCode
      ? `(select id from public.teams where code='${m.awayCode}')`
      : "null";
    return `  (${m.id}, '${m.stage}', ${m.groupLetter ? `'${m.groupLetter}'` : "null"}, ${home}, ${away}, ${q(m.homeLabel)}, ${q(m.awayLabel)}, '${m.kickoff}', ${q(m.venue)})`;
  })
  .join(",\n");
sql += ";\n";

writeFileSync(join(here, "..", "migrations", "0005_seed_fixture.sql"), sql, "utf8");

// ---- relatório --------------------------------------------------------------
console.log("=== VALIDAÇÃO DA FIXTURE ===");
console.log("Times:", teamsRaw.length, "| Grupos:", groupLetters.length, "| Jogos:", matches.length);
console.log("Por fase:", JSON.stringify(byStage));
console.log("Abertura (UTC):", matches[0].kickoff, "| Final (UTC):", matches[matches.length - 1].kickoff);
console.log(errors.length ? "ERROS:\n - " + errors.join("\n - ") : "Sem erros estruturais ✔");
console.log(crossMismatch.length ? "CROSS-CHECK (openfootball x fixturedownload):\n - " + crossMismatch.join("\n - ") : "Cross-check de grupos: IDÊNTICO entre as duas fontes ✔");
console.log("\n=== GRUPOS (para você validar com o oficial) ===");
for (const g of groupLetters) console.log(`Grupo ${g}: ${groups[g].join(", ")}`);
console.log("\nSQL gerado em supabase/migrations/0005_seed_fixture.sql");
