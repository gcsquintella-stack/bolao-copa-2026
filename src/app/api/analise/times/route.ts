/* eslint-disable @typescript-eslint/no-explicit-any -- JSON externo da ESPN, sem tipos */
import { NextResponse, type NextRequest } from "next/server";

// Médias do torneio por time (Fase 2): posse, finalizações e chutes no alvo,
// agregados dos jogos já disputados. Os event ids vêm do cliente (que já tem a
// fixture), então a rota é pública e sem banco. xG NÃO é agregável por time
// (a ESPN só expõe por jogador), por isso fica de fora.

const SUM = (id: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${encodeURIComponent(id)}`;

function statsFor(j: any, code: string): { poss: number; shots: number; sot: number } | null {
  const teams: any[] = j?.boxscore?.teams ?? [];
  const t = teams.find((x) => x?.team?.abbreviation === code);
  if (!t) return null;
  const list: any[] = t.statistics ?? [];
  const get = (name: string) => {
    const s = list.find((z) => z?.name === name);
    const n = s ? Number(s.displayValue) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const poss = get("possessionPct");
  const shots = get("totalShots");
  const sot = get("shotsOnTarget");
  if (poss == null && shots == null && sot == null) return null;
  return { poss: poss ?? 0, shots: shots ?? 0, sot: sot ?? 0 };
}

async function aggregate(code: string | null, eventCsv: string | null) {
  if (!code || !eventCsv) return { games: 0, possession: null, shots: null, sot: null };
  const ids = eventCsv.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
  const rows: { poss: number; shots: number; sot: number }[] = [];
  await Promise.all(
    ids.map(async (id) => {
      try {
        const r = await fetch(SUM(id), { next: { revalidate: 300 } });
        if (!r.ok) return;
        const s = statsFor(await r.json(), code);
        if (s) rows.push(s);
      } catch {
        /* ignora evento com falha */
      }
    }),
  );
  if (rows.length === 0) return { games: 0, possession: null, shots: null, sot: null };
  const avg = (k: "poss" | "shots" | "sot") => rows.reduce((a, x) => a + x[k], 0) / rows.length;
  return {
    games: rows.length,
    possession: Math.round(avg("poss")),
    shots: Math.round(avg("shots") * 10) / 10,
    sot: Math.round(avg("sot") * 10) / 10,
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const home = q.get("home");
  const away = q.get("away");
  const [h, a] = await Promise.all([
    aggregate(home, q.get("he")),
    aggregate(away, q.get("ae")),
  ]);
  const out: Record<string, unknown> = {};
  if (home) out[home] = h;
  if (away) out[away] = a;
  return NextResponse.json(out);
}
