/* eslint-disable @typescript-eslint/no-explicit-any -- JSON externo da ESPN, sem tipos */
import { NextResponse, type NextRequest } from "next/server";

// Análise pré-jogo a partir da API pública da ESPN (summary): probabilidade
// (linha de mercado normalizada), forma recente (últimos 5) e confronto direto.
// Dados públicos, nada armazenado; cache de 5 min no fetch. Sem banco/login.

const SUM = (id: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${encodeURIComponent(id)}`;

function mlToProb(ml: unknown): number | null {
  const n = typeof ml === "number" ? ml : Number(ml);
  if (!Number.isFinite(n) || n === 0) return null;
  return n < 0 ? -n / (-n + 100) : 100 / (n + 100);
}

const EMPTY = { prob: null, form: {}, h2h: { games: [] } };

export async function GET(req: NextRequest) {
  const event = req.nextUrl.searchParams.get("event");
  if (!event) return NextResponse.json({ error: "missing event" }, { status: 400 });

  let j: any;
  try {
    const r = await fetch(SUM(event), { next: { revalidate: 300 } });
    if (!r.ok) throw new Error(`espn ${r.status}`);
    j = await r.json();
  } catch {
    return NextResponse.json(EMPTY);
  }

  const comp: any[] = j?.header?.competitions?.[0]?.competitors ?? [];
  const homeCode = comp.find((c) => c?.homeAway === "home")?.team?.abbreviation ?? null;
  const awayCode = comp.find((c) => c?.homeAway === "away")?.team?.abbreviation ?? null;
  const idToCode: Record<string, string> = {};
  for (const c of comp) if (c?.team?.id && c?.team?.abbreviation) idToCode[c.team.id] = c.team.abbreviation;

  // Probabilidade: linha de mercado (moneyline) -> implícita -> normalizada.
  let prob: Record<string, number> | null = null;
  const pc = (j?.pickcenter ?? []).find(
    (p: any) => p?.homeTeamOdds?.moneyLine != null && p?.awayTeamOdds?.moneyLine != null,
  );
  if (pc && homeCode && awayCode) {
    const ph = mlToProb(pc.homeTeamOdds?.moneyLine);
    const pa = mlToProb(pc.awayTeamOdds?.moneyLine);
    const pd = mlToProb(pc.drawOdds?.moneyLine) ?? 0;
    if (ph != null && pa != null) {
      const sum = ph + pa + pd;
      prob = {
        [homeCode]: Math.round((ph / sum) * 100),
        [awayCode]: Math.round((pa / sum) * 100),
        draw: Math.round((pd / sum) * 100),
      };
    }
  }

  // Forma recente (últimos 5) por código de time.
  const form: Record<string, { r: string; score: string }[]> = {};
  for (const t of j?.lastFiveGames ?? []) {
    const code = t?.team?.abbreviation;
    const tid = t?.team?.id;
    if (!code) continue;
    form[code] = (t?.events ?? []).slice(0, 5).map((e: any) => {
      const isHome = tid != null && String(e?.homeTeamId) === String(tid);
      const gf = isHome ? e?.homeTeamScore : e?.awayTeamScore;
      const ga = isHome ? e?.awayTeamScore : e?.homeTeamScore;
      return {
        r: typeof e?.gameResult === "string" ? e.gameResult : "?",
        score: gf != null && ga != null ? `${gf}-${ga}` : (e?.score ?? ""),
      };
    });
  }

  // Confronto direto (H2H): últimos encontros entre os dois times.
  const games = ((j?.headToHeadGames ?? [])[0]?.events ?? []).slice(0, 5).map((e: any) => ({
    date: typeof e?.gameDate === "string" ? e.gameDate.slice(0, 10) : "",
    home: idToCode[e?.homeTeamId] ?? "?",
    away: idToCode[e?.awayTeamId] ?? "?",
    hs: e?.homeTeamScore ?? "",
    as: e?.awayTeamScore ?? "",
  }));

  return NextResponse.json({ prob, homeCode, awayCode, form, h2h: { games } });
}
