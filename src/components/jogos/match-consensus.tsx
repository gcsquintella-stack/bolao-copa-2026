"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// "Palpites do grupo" de um jogo. Só é montado para jogos JÁ INICIADOS (a card
// só mostra o toggle quando travado) — o RLS de predictions devolve os palpites
// de todos nesse caso. predictions não tem FK direta com profiles, então
// buscamos os nomes numa 2ª query e cruzamos pelo user_id.

type Pred = { home: number; away: number; userId: string };

export function MatchConsensus({
  matchId,
  homeName,
  awayName,
  result,
}: {
  matchId: number;
  homeName: string;
  awayName: string;
  result: { home: number; away: number } | null;
}) {
  const [preds, setPreds] = useState<Pred[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    void (async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("home_score, away_score, user_id")
        .eq("match_id", matchId);
      if (!alive) return;
      if (error) {
        console.error("consensus error", error);
        setPreds([]);
        return;
      }
      const rows: Pred[] = (data ?? []).map((r) => ({
        home: r.home_score as number,
        away: r.away_score as number,
        userId: r.user_id as string,
      }));
      setPreds(rows);

      // nomes só importam pra "quem cravou"; busca os perfis desses usuários.
      const ids = [...new Set(rows.map((r) => r.userId))];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", ids);
        if (!alive) return;
        const m = new Map<string, string>();
        for (const p of profs ?? [])
          m.set(p.id as string, (p.display_name as string) ?? "?");
        setNames(m);
      }
    })();
    return () => {
      alive = false;
    };
  }, [matchId]);

  if (preds === null) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> carregando palpites…
      </div>
    );
  }
  if (preds.length === 0) {
    return (
      <div className="py-3 text-center text-xs text-muted-foreground">
        Ninguém palpitou neste jogo.
      </div>
    );
  }

  const total = preds.length;
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  const scoreCount = new Map<string, number>();
  for (const p of preds) {
    if (p.home > p.away) homeWin++;
    else if (p.home < p.away) awayWin++;
    else draw++;
    const k = `${p.home}-${p.away}`;
    scoreCount.set(k, (scoreCount.get(k) ?? 0) + 1);
  }
  const pct = (n: number) => Math.round((n / total) * 100);

  let topScore = "";
  let topN = 0;
  for (const [k, n] of scoreCount)
    if (n > topN) {
      topN = n;
      topScore = k;
    }
  const [th, ta] = topScore.split("-");

  const cravaram = result
    ? preds
        .filter((p) => p.home === result.home && p.away === result.away)
        .map((p) => names.get(p.userId) ?? "?")
    : null;

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Palpites do grupo</span>
        <span>
          {total} {total === 1 ? "palpite" : "palpites"}
        </span>
      </div>

      {/* barra de quem-ganha */}
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {homeWin > 0 && (
          <div className="bg-primary" style={{ width: `${pct(homeWin)}%` }} />
        )}
        {draw > 0 && (
          <div
            className="bg-muted-foreground/40"
            style={{ width: `${pct(draw)}%` }}
          />
        )}
        {awayWin > 0 && (
          <div className="bg-amber-500" style={{ width: `${pct(awayWin)}%` }} />
        )}
      </div>
      <div className="flex justify-between gap-2 text-[11px]">
        <span className="min-w-0 truncate font-medium text-primary">
          {homeName} {pct(homeWin)}%
        </span>
        <span className="flex-none text-muted-foreground">
          empate {pct(draw)}%
        </span>
        <span className="min-w-0 truncate text-right font-medium text-amber-600">
          {pct(awayWin)}% {awayName}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Placar mais palpitado</span>
        <span className="font-bold tabular-nums">
          {th} × {ta}{" "}
          <span className="font-normal text-muted-foreground">({topN})</span>
        </span>
      </div>

      {cravaram && (
        <div className="text-xs">
          {cravaram.length > 0 ? (
            <>
              <span className="text-muted-foreground">Cravaram: </span>
              <span className="font-medium">{cravaram.join(", ")}</span>
            </>
          ) : (
            <span className="text-muted-foreground">
              Ninguém cravou o placar.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
