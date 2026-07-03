"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Análise pré-jogo (ESPN): probabilidade da linha de mercado, forma recente
// (últimos 5), confronto direto e — Fase 2 — médias do torneio (posse,
// finalizações, chutes no alvo). Lazy-load ao abrir; dados públicos. Chaveado
// por código de time (ESPN abbr == teams.code), independe da orientação.

type Form = { r: string; score: string };
type Analysis = {
  prob: Record<string, number> | null;
  form: Record<string, Form[]>;
  h2h: { games: { date: string; home: string; away: string; hs: string; as: string }[] };
};
type TeamAvg = { games: number; possession: number | null; shots: number | null; sot: number | null };

const RES: Record<string, { label: string; cls: string }> = {
  W: { label: "V", cls: "bg-positive/15 text-positive" },
  D: { label: "E", cls: "bg-muted text-muted-foreground" },
  L: { label: "D", cls: "bg-destructive/15 text-destructive" },
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y.slice(2)}` : iso;
}

function FormRow({ name, games }: { name: string; games?: Form[] }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{name}</span>
      <div className="flex flex-none gap-1">
        {games && games.length > 0 ? (
          games.map((g, i) => {
            const r = RES[g.r] ?? { label: "?", cls: "bg-muted text-muted-foreground" };
            return (
              <span
                key={i}
                title={g.score}
                className={cn(
                  "grid size-5 place-items-center rounded text-[10px] font-bold",
                  r.cls,
                )}
              >
                {r.label}
              </span>
            );
          })
        ) : (
          <span className="text-[11px] text-muted-foreground">sem dados</span>
        )}
      </div>
    </div>
  );
}

function StatCmp({
  label,
  home,
  away,
  suffix = "",
}: {
  label: string;
  home: number | null;
  away: number | null;
  suffix?: string;
}) {
  const both = home != null && away != null;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs tabular-nums">
      <span className={cn("text-left", both && home! >= away! ? "font-bold" : "text-muted-foreground")}>
        {home != null ? `${home}${suffix}` : "–"}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-right", both && away! >= home! ? "font-bold" : "text-muted-foreground")}>
        {away != null ? `${away}${suffix}` : "–"}
      </span>
    </div>
  );
}

export function MatchAnalysis({
  event,
  homeCode,
  awayCode,
  homeName,
  awayName,
  homeEvents,
  awayEvents,
}: {
  event: string;
  homeCode: string;
  awayCode: string;
  homeName: string;
  awayName: string;
  homeEvents?: string[];
  awayEvents?: string[];
}) {
  const [data, setData] = useState<Analysis | null>(null);
  const [err, setErr] = useState(false);
  const [stats, setStats] = useState<Record<string, TeamAvg> | null>(null);

  const heStr = (homeEvents ?? []).join(",");
  const aeStr = (awayEvents ?? []).join(",");

  useEffect(() => {
    let alive = true;
    fetch(`/api/analise?event=${encodeURIComponent(event)}`)
      .then((r) => r.json())
      .then((j: Analysis) => alive && setData(j))
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, [event]);

  useEffect(() => {
    if (!heStr && !aeStr) return;
    let alive = true;
    const p = new URLSearchParams({ home: homeCode, away: awayCode, he: heStr, ae: aeStr });
    fetch(`/api/analise/times?${p.toString()}`)
      .then((r) => r.json())
      .then((j: Record<string, TeamAvg>) => alive && setStats(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [homeCode, awayCode, heStr, aeStr]);

  if (err) {
    return (
      <div className="mt-3 border-t border-border pt-3 text-center text-xs text-muted-foreground">
        Análise indisponível no momento.
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> carregando análise…
      </div>
    );
  }

  const prob = data.prob;
  const hp = prob?.[homeCode];
  const ap = prob?.[awayCode];
  const dp = prob?.draw ?? 0;
  const hasForm = Object.keys(data.form).length > 0;
  const games = data.h2h?.games ?? [];
  const sh = stats?.[homeCode];
  const sa = stats?.[awayCode];
  const hasAvg = (sh?.games ?? 0) > 0 || (sa?.games ?? 0) > 0;

  if (hp == null && ap == null && !hasForm && games.length === 0 && !hasAvg) {
    return (
      <div className="mt-3 border-t border-border pt-3 text-center text-xs text-muted-foreground">
        Sem análise para este jogo ainda.
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      {hp != null && ap != null && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Probabilidade</span>
            <span>linha de mercado</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            <div className="bg-primary" style={{ width: `${hp}%` }} />
            <div className="bg-muted-foreground/40" style={{ width: `${dp}%` }} />
            <div className="bg-amber-500" style={{ width: `${ap}%` }} />
          </div>
          <div className="flex justify-between gap-2 text-[11px]">
            <span className="min-w-0 truncate font-medium text-primary">
              {homeName} {hp}%
            </span>
            <span className="flex-none text-muted-foreground">empate {dp}%</span>
            <span className="min-w-0 truncate text-right font-medium text-amber-600">
              {ap}% {awayName}
            </span>
          </div>
        </div>
      )}

      {hasAvg && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="min-w-0 truncate font-medium text-foreground">{homeName}</span>
            <span>médias no torneio</span>
            <span className="min-w-0 truncate text-right font-medium text-foreground">{awayName}</span>
          </div>
          <StatCmp label="Posse" home={sh?.possession ?? null} away={sa?.possession ?? null} suffix="%" />
          <StatCmp label="Finalizações" home={sh?.shots ?? null} away={sa?.shots ?? null} />
          <StatCmp label="No alvo" home={sh?.sot ?? null} away={sa?.sot ?? null} />
        </div>
      )}

      {hasForm && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-muted-foreground">
            Forma recente (últimos 5)
          </span>
          <FormRow name={homeName} games={data.form[homeCode]} />
          <FormRow name={awayName} games={data.form[awayCode]} />
        </div>
      )}

      {games.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">Confronto direto</span>
          {games.map((g, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{fmtDate(g.date)}</span>
              <span className="font-medium tabular-nums">
                {g.home} {g.hs} × {g.as} {g.away}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
