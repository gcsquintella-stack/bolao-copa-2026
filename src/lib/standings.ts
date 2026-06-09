// Classificação dos grupos calculada a partir dos resultados (jogos encerrados
// da fase de grupos). Ordena por pontos → saldo → gols pró → nome (desempate
// completo da FIFA — confronto direto, fair play — fica como refinamento futuro).

export type StandingTeam = {
  id: number;
  name: string;
  code: string | null;
  group_label: string | null;
};

export type StandingMatch = {
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

export type StandingRow = {
  team: { id: number; name: string; code: string | null };
  played: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

export function computeStandings(
  teams: StandingTeam[],
  matches: StandingMatch[],
): { group: string; rows: StandingRow[] }[] {
  const byId = new Map<number, StandingRow>();
  for (const t of teams) {
    if (!t.group_label) continue;
    byId.set(t.id, {
      team: { id: t.id, name: t.name, code: t.code },
      played: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
    });
  }

  for (const m of matches) {
    if (
      m.status !== "finished" ||
      m.home_team_id == null ||
      m.away_team_id == null ||
      m.home_score == null ||
      m.away_score == null
    )
      continue;
    const h = byId.get(m.home_team_id);
    const a = byId.get(m.away_team_id);
    if (!h || !a) continue;
    h.played++;
    a.played++;
    h.gf += m.home_score;
    h.ga += m.away_score;
    a.gf += m.away_score;
    a.ga += m.home_score;
    if (m.home_score > m.away_score) {
      h.w++;
      h.pts += 3;
      a.l++;
    } else if (m.home_score < m.away_score) {
      a.w++;
      a.pts += 3;
      h.l++;
    } else {
      h.d++;
      a.d++;
      h.pts++;
      a.pts++;
    }
  }

  const groups = new Map<string, StandingRow[]>();
  for (const t of teams) {
    if (!t.group_label) continue;
    const r = byId.get(t.id);
    if (!r) continue;
    r.gd = r.gf - r.ga;
    const arr = groups.get(t.group_label);
    if (arr) arr.push(r);
    else groups.set(t.group_label, [r]);
  }

  return [...groups.entries()]
    .map(([group, rows]) => ({
      group,
      rows: rows.sort(
        (x, y) =>
          y.pts - x.pts ||
          y.gd - x.gd ||
          y.gf - x.gf ||
          x.team.name.localeCompare(y.team.name),
      ),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
}
