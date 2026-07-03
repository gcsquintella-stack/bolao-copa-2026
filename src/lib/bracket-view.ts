import type { MatchRow } from "@/components/jogos/types";
import type { StandingRow } from "@/lib/standings";
import type {
  BracketData,
  BracketMatch,
  BracketSlot,
} from "@/components/copa/bracket-tree";

// Transforma os jogos do mata-mata (+ classificação ao vivo) no modelo visual do
// BracketTree, resolvendo cada vaga ao time definido, ao candidato de grupo
// ("Provável"), ao par "Venc. A × B" (quando o alimentador tem os dois times),
// ou a pendente (fundo demais / grupo sem jogos). 3º lugar fica fora do tronco.

type Team = { name: string; code: string | null };
type Standings = { group: string; rows: StandingRow[] }[];

const ROUND: Record<string, number> = { r32: 0, r16: 1, qf: 2, sf: 3, final: 4 };
const ROUND_NAME: Record<string, string> = {
  r32: "16-avos",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Semifinais",
  final: "Final",
};

function occupant(standings: Standings, group: string, pos: number): Team | null {
  const g = standings.find((s) => s.group === group);
  if (!g || g.rows.length < pos) return null;
  if (!g.rows.some((r) => r.played > 0)) return null;
  const r = g.rows[pos - 1];
  return { name: r.team.name, code: r.team.code };
}

// Um único time concreto para um lado de um jogo alimentador (para o par).
function teamOf(m: MatchRow, side: "home" | "away", standings: Standings): Team | null {
  const t = side === "home" ? m.home : m.away;
  if (t) return { name: t.name, code: t.code };
  const label = side === "home" ? m.home_label : m.away_label;
  const gm = label ? /^([123])([A-L])$/.exec(label) : null;
  if (gm) return occupant(standings, gm[2], Number(gm[1]));
  return null;
}

function resolveSlot(
  m: MatchRow,
  side: "home" | "away",
  koById: Map<number, MatchRow>,
  standings: Standings,
): BracketSlot {
  const team = side === "home" ? m.home : m.away;
  const myScore = side === "home" ? m.home_score : m.away_score;
  const otherScore = side === "home" ? m.away_score : m.home_score;
  const label = side === "home" ? m.home_label : m.away_label;

  if (team) {
    const finished = m.status === "finished" && myScore != null && otherScore != null;
    return {
      kind: "team",
      team: { name: team.name, code: team.code },
      score: finished ? myScore : null,
      winner: finished ? myScore! > otherScore! : false,
    };
  }
  if (!label) return { kind: "pending", label: "A definir" };

  let mm: RegExpExecArray | null;
  if ((mm = /^([123])([A-L])$/.exec(label))) {
    const pos = Number(mm[1]);
    const grp = mm[2];
    const cand = occupant(standings, grp, pos);
    return cand
      ? { kind: "team", team: cand, provisional: true }
      : { kind: "pending", label: `${pos}º Grupo ${grp}` };
  }
  if (/^3[A-L/]+$/.test(label)) return { kind: "pending", label: "3º colocado" };
  if ((mm = /^([WL])(\d+)$/.exec(label))) {
    const fm = koById.get(Number(mm[2]));
    if (fm && mm[1] === "W") {
      const a = teamOf(fm, "home", standings);
      const b = teamOf(fm, "away", standings);
      if (a && b) return { kind: "pair", a, b };
      return { kind: "pending", label: `Vencedor · ${ROUND_NAME[fm.stage] ?? "a definir"}` };
    }
    return { kind: "pending", label: mm[1] === "W" ? "Vencedor" : "Perdedor" };
  }
  return { kind: "pending", label };
}

// Times que ainda podem ocupar esta vaga (painel), descendo pela árvore.
function sideTeams(
  m: MatchRow,
  side: "home" | "away",
  koById: Map<number, MatchRow>,
  standings: Standings,
): string[] {
  const slot = resolveSlot(m, side, koById, standings);
  if (slot.kind === "team") return [slot.team.name];
  if (slot.kind === "pair") return [slot.a.name, slot.b.name];
  const label = side === "home" ? m.home_label : m.away_label;
  const wm = label ? /^W(\d+)$/.exec(label) : null;
  const fm = wm ? koById.get(Number(wm[1])) : null;
  if (fm)
    return [
      ...sideTeams(fm, "home", koById, standings),
      ...sideTeams(fm, "away", koById, standings),
    ];
  return [];
}

export function toBracketData(knockout: MatchRow[], standings: Standings): BracketData {
  const koById = new Map<number, MatchRow>();
  for (const m of knockout) koById.set(m.id, m);

  // Fiação (feeds): PRIORIZA a evolução real — cada time numa vaga veio de um
  // jogo específico da rodada anterior (fonte de verdade; ignora o rótulo torto
  // do seed). Cai nos rótulos só para rodadas futuras ainda sem times definidos.
  const posOf = new Map<string, number>();
  for (const m of knockout) {
    if (!(m.stage in ROUND)) continue;
    for (const t of [m.home, m.away])
      if (t?.code) posOf.set(`${ROUND[m.stage]}:${t.code}`, m.id);
  }
  const feedsOf = new Map<number, string>();
  for (const m of knockout) {
    if (!(m.stage in ROUND) || ROUND[m.stage] === 0) continue;
    for (const t of [m.home, m.away]) {
      if (!t?.code) continue;
      const child = posOf.get(`${ROUND[m.stage] - 1}:${t.code}`);
      if (child != null) feedsOf.set(child, String(m.id));
    }
  }
  for (const p of knockout) {
    for (const lbl of [p.home_label, p.away_label]) {
      const wm = lbl ? /^W(\d+)$/.exec(lbl) : null;
      if (wm && !feedsOf.has(Number(wm[1]))) feedsOf.set(Number(wm[1]), String(p.id));
    }
  }

  const matches: BracketMatch[] = knockout
    .filter((m) => m.stage in ROUND)
    .map((m) => ({
      id: String(m.id),
      round: ROUND[m.stage],
      feeds: feedsOf.get(m.id) ?? null,
      status:
        m.status === "live" ? "live" : m.status === "finished" ? "finished" : "scheduled",
      kickoff: m.kickoff_at,
      home: resolveSlot(m, "home", koById, standings),
      away: resolveSlot(m, "away", koById, standings),
      teams: [
        ...new Set([
          ...sideTeams(m, "home", koById, standings),
          ...sideTeams(m, "away", koById, standings),
        ]),
      ],
    }));

  return {
    rounds: ["16-avos", "Oitavas", "Quartas", "Semifinais", "Final"],
    matches,
  };
}
