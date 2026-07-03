"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Análise pré-jogo (ESPN, via /api/analise): probabilidade da linha de mercado,
// forma recente (últimos 5) e confronto direto. Lazy-load ao abrir o painel;
// dados públicos. Chaveado por código de time (ESPN abbr == teams.code), então
// independe da orientação casa/fora nossa.

type Form = { r: string; score: string };
type Analysis = {
  prob: Record<string, number> | null;
  form: Record<string, Form[]>;
  h2h: { games: { date: string; home: string; away: string; hs: string; as: string }[] };
};

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

export function MatchAnalysis({
  event,
  homeCode,
  awayCode,
  homeName,
  awayName,
}: {
  event: string;
  homeCode: string;
  awayCode: string;
  homeName: string;
  awayName: string;
}) {
  const [data, setData] = useState<Analysis | null>(null);
  const [err, setErr] = useState(false);

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

  if (hp == null && ap == null && !hasForm && games.length === 0) {
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
