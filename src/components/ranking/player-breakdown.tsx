"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Flag } from "@/components/ui/flag";
import { cn } from "@/lib/utils";
import {
  scorePrediction,
  stageMultiplier,
  type ScoreTier,
  type ScoringConfig,
} from "@/lib/scoring";
import { STAGE_LABEL, type MatchStage } from "@/components/jogos/types";

// Extrato jogo a jogo de um jogador. Carrega sob demanda (ao expandir a linha do
// ranking) pela sessão do usuário — o RLS de predictions garante que só vêm os
// palpites de jogos JÁ INICIADOS (dos outros) + todos os seus. Filtramos ainda
// pros que têm RESULTADO (já pontuaram). Não exige schema novo.

type TeamLite = { name: string; code: string | null; flag: string | null } | null;

type Row = {
  home_score: number;
  away_score: number;
  points: number | null;
  match: {
    id: number;
    stage: MatchStage;
    group_label: string | null;
    kickoff_at: string;
    home_score: number | null;
    away_score: number | null;
    home: TeamLite;
    away: TeamLite;
  };
};

// Supabase às vezes devolve embed como array; normaliza pra objeto.
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

const TIER_LABEL: Record<ScoreTier, string> = {
  exact: "cravada",
  winner_goaldiff: "placar + saldo",
  winner_only: "resultado",
  wrong: "erro",
};

export function PlayerBreakdown({
  userId,
  isMe,
  scoring,
}: {
  userId: string;
  isMe: boolean;
  scoring: ScoringConfig;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    void (async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select(
          "home_score, away_score, points, match:matches!inner(id, stage, group_label, kickoff_at, home_score, away_score, home:teams!home_team_id(name,code,flag), away:teams!away_team_id(name,code,flag))",
        )
        .eq("user_id", userId);
      if (!alive) return;
      if (error) {
        console.error("breakdown error", error);
        setRows([]);
        return;
      }
      const norm = (data ?? [])
        .map((r) => {
          const m = one(r.match as unknown);
          if (!m) return null;
          const mm = m as Row["match"];
          return {
            ...(r as unknown as Row),
            match: { ...mm, home: one(mm.home), away: one(mm.away) },
          } as Row;
        })
        .filter(
          (r): r is Row =>
            !!r && r.match.home_score != null && r.match.away_score != null,
        )
        .sort(
          (a, b) =>
            new Date(b.match.kickoff_at).getTime() -
            new Date(a.match.kickoff_at).getTime(),
        );
      setRows(norm);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  if (rows === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> carregando extrato…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Nenhum jogo encerrado ainda — o extrato aparece quando saírem os
        resultados.
      </div>
    );
  }

  const total = rows.reduce((s, r) => s + (r.points ?? 0), 0);
  const cravadas = rows.filter(
    (r) =>
      r.home_score === r.match.home_score &&
      r.away_score === r.match.away_score,
  ).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-muted-foreground">
          {isMe ? "Seu extrato" : "Extrato"}
        </span>
        <span className="font-medium text-foreground">
          {total} pts · {cravadas} crav. · {rows.length} jogos
        </span>
      </div>

      {rows.map((r) => {
        const { tier } = scorePrediction(
          { home: r.home_score, away: r.away_score },
          { home: r.match.home_score!, away: r.match.away_score! },
          r.match.stage,
          scoring,
        );
        const mult = stageMultiplier(r.match.stage, scoring);
        const pts = r.points ?? 0;
        return (
          <div
            key={r.match.id}
            className="rounded-xl border border-border bg-card/60 p-3"
          >
            <div className="mb-1.5 text-[11px] text-muted-foreground">
              {r.match.stage === "group"
                ? `Grupo ${r.match.group_label}`
                : STAGE_LABEL[r.match.stage]}
              {mult > 1 && (
                <span className="ml-1 font-bold text-primary">
                  ×{`${mult}`.replace(".", ",")}
                </span>
              )}
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Flag
                  code={r.match.home?.code}
                  name={r.match.home?.name}
                  size={18}
                />
                <span className="truncate text-sm">{r.match.home?.name}</span>
              </div>
              <span className="text-sm font-bold tabular-nums">
                {r.match.home_score} × {r.match.away_score}
              </span>
              <div className="flex min-w-0 items-center justify-end gap-1.5">
                <span className="truncate text-right text-sm">
                  {r.match.away?.name}
                </span>
                <Flag
                  code={r.match.away?.code}
                  name={r.match.away?.name}
                  size={18}
                />
              </div>
            </div>

            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                palpite{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {r.home_score} × {r.away_score}
                </span>
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  pts > 0
                    ? "bg-positive/15 text-positive"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {pts > 0 ? `+${pts}` : "0"} · {TIER_LABEL[tier]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
