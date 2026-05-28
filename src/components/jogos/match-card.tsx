"use client";

import { useCallback, useRef, useState } from "react";
import { Check, Loader2, Lock, Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { STAGE_LABEL, type MatchRow, type PredictionRow } from "./types";

const brt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function teamLabel(t: MatchRow["home"], fallback: string | null) {
  if (t) return { flag: t.flag ?? "🏳️", name: t.name };
  return { flag: "❔", name: fallback ?? "A definir" };
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function MatchCard({
  match,
  initial,
  userId,
}: {
  match: MatchRow;
  initial: PredictionRow | null;
  userId: string;
}) {
  const supabase = createClient();
  const locked = Date.now() >= new Date(match.kickoff_at).getTime();

  const [home, setHome] = useState<number | null>(initial?.home_score ?? null);
  const [away, setAway] = useState<number | null>(initial?.away_score ?? null);
  const [save, setSave] = useState<SaveState>("idle");
  const existsRef = useRef(initial != null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    async (h: number, a: number) => {
      setSave("saving");
      const exists = existsRef.current;
      const { error } = exists
        ? await supabase
            .from("predictions")
            .update({ home_score: h, away_score: a })
            .eq("user_id", userId)
            .eq("match_id", match.id)
        : await supabase
            .from("predictions")
            .insert({ user_id: userId, match_id: match.id, home_score: h, away_score: a });
      if (error) {
        setSave("error");
        return;
      }
      existsRef.current = true;
      setSave("saved");
      setTimeout(() => setSave("idle"), 1500);
    },
    [supabase, userId, match.id],
  );

  const schedule = useCallback(
    (h: number | null, a: number | null) => {
      if (h == null || a == null) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => persist(h, a), 700);
    },
    [persist],
  );

  function bump(side: "h" | "a", delta: number) {
    if (locked) return;
    if (side === "h") {
      const v = Math.max(0, Math.min(20, (home ?? 0) + delta));
      setHome(v);
      schedule(v, away ?? 0);
      if (away == null) setAway(0);
    } else {
      const v = Math.max(0, Math.min(20, (away ?? 0) + delta));
      setAway(v);
      schedule(home ?? 0, v);
      if (home == null) setHome(0);
    }
  }

  const h = teamLabel(match.home, match.home_label);
  const a = teamLabel(match.away, match.away_label);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/50 p-4 transition-colors",
        locked && "opacity-80",
      )}
    >
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {match.stage === "group"
            ? `Grupo ${match.group_label}`
            : STAGE_LABEL[match.stage]}
          {match.venue ? ` · ${match.venue}` : ""}
        </span>
        <span className="flex items-center gap-1">
          {locked ? (
            <>
              <Lock className="size-3" /> Encerrado
            </>
          ) : (
            `Fecha ${brt.format(new Date(match.kickoff_at))}`
          )}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* casa */}
        <div className="flex items-center gap-2 justify-self-start">
          <span className="text-2xl">{h.flag}</span>
          <span className="text-sm font-medium">{h.name}</span>
        </div>

        {/* placar */}
        <div className="flex items-center gap-2">
          <Stepper value={home} onBump={(d) => bump("h", d)} locked={locked} />
          <span className="text-muted-foreground">×</span>
          <Stepper value={away} onBump={(d) => bump("a", d)} locked={locked} />
        </div>

        {/* fora */}
        <div className="flex items-center gap-2 justify-self-end">
          <span className="text-sm font-medium">{a.name}</span>
          <span className="text-2xl">{a.flag}</span>
        </div>
      </div>

      <div className="mt-2 h-4 text-right text-xs">
        {save === "saving" && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> salvando…
          </span>
        )}
        {save === "saved" && (
          <span className="inline-flex items-center gap-1 text-primary">
            <Check className="size-3" /> palpite salvo
          </span>
        )}
        {save === "error" && (
          <span className="text-destructive">erro ao salvar — tente de novo</span>
        )}
      </div>
    </div>
  );
}

function Stepper({
  value,
  onBump,
  locked,
}: {
  value: number | null;
  onBump: (delta: number) => void;
  locked: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        aria-label="Aumentar"
        disabled={locked}
        onClick={() => onBump(1)}
        className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
      >
        <Plus className="size-4" />
      </button>
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-xl font-bold tabular-nums">
        {value ?? "–"}
      </div>
      <button
        type="button"
        aria-label="Diminuir"
        disabled={locked}
        onClick={() => onBump(-1)}
        className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
      >
        <Minus className="size-4" />
      </button>
    </div>
  );
}
