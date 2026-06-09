"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Lock, Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/ui/flag";
import { isKickoffPassed } from "@/lib/time";
import {
  scorePrediction,
  stageMultiplier,
  type ScoreTier,
  type ScoringConfig,
} from "@/lib/scoring";
import { STAGE_LABEL, type MatchRow, type PredictionRow } from "./types";

const brt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

type SaveState = "idle" | "saving" | "saved" | "error";

export function MatchCard({
  match,
  initial,
  userId,
  scoring,
}: {
  match: MatchRow;
  initial: PredictionRow | null;
  userId: string;
  scoring: ScoringConfig;
}) {
  const supabase = createClient();
  const locked = isKickoffPassed(match.kickoff_at);
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const hasResult = match.home_score != null && match.away_score != null;
  const mult = stageMultiplier(match.stage, scoring);
  const multLabel = mult % 1 === 0 ? `${mult}` : `${mult}`.replace(".", ",");

  const [home, setHome] = useState<number | null>(initial?.home_score ?? null);
  const [away, setAway] = useState<number | null>(initial?.away_score ?? null);
  const [save, setSave] = useState<SaveState>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  // palpite efetivamente persistido (controla o azul "cheio" do tile). Só vira
  // true no sucesso e nunca volta a false ao editar -> sem flicker.
  const [saved, setSaved] = useState(initial != null);
  const existsRef = useRef(initial != null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef<{ h: number; a: number } | null>(null);
  const persistRef = useRef<((h: number, a: number) => void) | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const wasFinishedRef = useRef(isFinished);

  const persist = useCallback(
    async (h: number, a: number) => {
      // serializa: um salvamento por vez; guarda o último valor pendente
      if (savingRef.current) {
        pendingRef.current = { h, a };
        return;
      }
      savingRef.current = true;
      setSave("saving");

      const wasExisting = existsRef.current;
      // otimista: a partir daqui, qualquer salvamento seguinte é UPDATE
      // (evita INSERT duplicado se dois dispararem juntos)
      existsRef.current = true;

      const { error } = wasExisting
        ? await supabase
            .from("predictions")
            .update({ home_score: h, away_score: a })
            .eq("user_id", userId)
            .eq("match_id", match.id)
        : await supabase
            .from("predictions")
            .insert({ user_id: userId, match_id: match.id, home_score: h, away_score: a });

      savingRef.current = false;

      if (error) {
        existsRef.current = wasExisting; // reverte o flag otimista em caso de falha
        setSave("error");
        setErrMsg(`${error.code ?? ""} ${error.message ?? ""}`.trim());
        console.error("save prediction error", error);
        return;
      }

      setErrMsg(null);
      setSaved(true);
      setSave("saved");
      setTimeout(() => setSave("idle"), 1500);

      // se chegou um valor novo enquanto salvava, salva de novo (agora como UPDATE)
      if (pendingRef.current) {
        const p = pendingRef.current;
        pendingRef.current = null;
        persistRef.current?.(p.h, p.a);
      }
    },
    [supabase, userId, match.id],
  );

  // Mantém o ref do `persist` atualizado pra reprocessar pendências sem
  // referenciar `persist` antes da sua declaração (regra react-hooks/immutability).
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  // Confete na cravada — só quando o resultado ENTRA ao vivo (transição p/
  // encerrado), não no carregamento de um jogo já encerrado. Respeita reduced-motion.
  useEffect(() => {
    const justFinished = !wasFinishedRef.current && isFinished;
    wasFinishedRef.current = isFinished;
    if (
      !justFinished ||
      home == null ||
      away == null ||
      match.home_score == null ||
      match.away_score == null
    )
      return;
    const { tier } = scorePrediction(
      { home, away },
      { home: match.home_score, away: match.away_score },
      match.stage,
      scoring,
    );
    if (tier !== "exact") return;
    void (async () => {
      const confetti = (await import("canvas-confetti")).default;
      const el = cardRef.current;
      let origin = { x: 0.5, y: 0.4 };
      if (el) {
        const r = el.getBoundingClientRect();
        origin = {
          x: (r.left + r.width / 2) / window.innerWidth,
          y: (r.top + r.height / 2) / window.innerHeight,
        };
      }
      confetti({
        particleCount: 70,
        spread: 72,
        startVelocity: 30,
        scalar: 0.85,
        ticks: 160,
        origin,
        colors: ["#2456E6", "#16A34A", "#F4B740", "#E5484D"],
        disableForReducedMotion: true,
      });
    })();
  }, [isFinished, home, away, match.home_score, match.away_score, match.stage, scoring]);

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

  return (
    <div
      ref={cardRef}
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors",
        locked && "bg-card/60",
      )}
    >
      {/* cabeçalho: contexto + status */}
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
          <span>
            {match.stage === "group"
              ? `Grupo ${match.group_label}`
              : STAGE_LABEL[match.stage]}
          </span>
          {mult > 1 && (
            <span className="rounded bg-primary/10 px-1.5 py-px text-[10px] font-extrabold text-primary">
              ×{multLabel}
            </span>
          )}
          {match.venue && <span>· {match.venue}</span>}
        </span>
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 font-bold text-live">
            <span className="size-1.5 animate-pulse rounded-full bg-live" />
            AO VIVO
          </span>
        ) : locked || isFinished ? (
          <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
            <Lock className="size-3" /> Encerrado
          </span>
        ) : (
          <span className="font-medium text-muted-foreground">
            Fecha {brt.format(new Date(match.kickoff_at))}
          </span>
        )}
      </div>

      {/* confronto */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamSide team={match.home} fallback={match.home_label} />
        <Stepper
          home={home}
          away={away}
          onBump={bump}
          locked={locked}
          saved={saved}
        />
        <TeamSide team={match.away} fallback={match.away_label} align="right" />
      </div>

      {/* resultado + pontos do palpite (encerrado = gravado; ao vivo = provisório) */}
      {hasResult && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {isLive ? "Parcial" : "Resultado"}:{" "}
            <span className="font-bold text-foreground tabular-nums">
              {match.home_score} × {match.away_score}
            </span>
          </span>
          {home != null && away != null ? (
            (() => {
              const calc = scorePrediction(
                { home, away },
                { home: match.home_score!, away: match.away_score! },
                match.stage,
                scoring,
              );
              const pts =
                !isLive && initial?.points != null
                  ? initial.points
                  : calc.points;
              return <PointsChip points={pts} tier={calc.tier} live={isLive} />;
            })()
          ) : (
            <span className="text-[11px] text-muted-foreground">
              sem palpite
            </span>
          )}
        </div>
      )}

      {/* estado de salvamento */}
      <div className="mt-2 h-4 text-right text-xs">
        {save === "saving" && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> salvando…
          </span>
        )}
        {save === "saved" && (
          <span className="inline-flex animate-pop items-center gap-1 font-medium text-positive">
            <Check className="size-3" /> palpite salvo
          </span>
        )}
        {save === "error" && (
          <span className="text-destructive">
            erro ao salvar{errMsg ? `: ${errMsg}` : " — tente de novo"}
          </span>
        )}
      </div>
    </div>
  );
}

function PointsChip({
  points,
  tier,
  live,
}: {
  points: number;
  tier: ScoreTier;
  live: boolean;
}) {
  const positive = points > 0;
  if (live) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
          positive
            ? "bg-amber-100 text-amber-800"
            : "bg-muted text-muted-foreground",
        )}
      >
        {positive ? `+${points}` : "0"}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
        positive
          ? "bg-positive/15 text-positive"
          : "bg-muted text-muted-foreground",
      )}
    >
      {positive ? `+${points}` : "0 pts"}
      {tier === "exact" && (
        <span className="font-semibold opacity-75">· cravada</span>
      )}
    </span>
  );
}

function TeamSide({
  team,
  fallback,
  align = "left",
}: {
  team: MatchRow["home"];
  fallback: string | null;
  align?: "left" | "right";
}) {
  const name = team?.name ?? fallback ?? "A definir";
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        align === "right" && "flex-row-reverse justify-self-end",
      )}
    >
      <Flag code={team?.code} name={team?.name} size={30} />
      <span className="truncate text-sm font-semibold">{name}</span>
    </div>
  );
}

function Stepper({
  home,
  away,
  onBump,
  locked,
  saved,
}: {
  home: number | null;
  away: number | null;
  onBump: (side: "h" | "a", delta: number) => void;
  locked: boolean;
  saved: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <ScoreInput
        value={home}
        onBump={(d) => onBump("h", d)}
        locked={locked}
        saved={saved}
      />
      <span className="text-sm text-muted-foreground">×</span>
      <ScoreInput
        value={away}
        onBump={(d) => onBump("a", d)}
        locked={locked}
        saved={saved}
      />
    </div>
  );
}

function ScoreInput({
  value,
  onBump,
  locked,
  saved,
}: {
  value: number | null;
  onBump: (delta: number) => void;
  locked: boolean;
  saved: boolean;
}) {
  // azul "cheio" só quando o palpite está salvo; senão, neutro (claro).
  const filled = value != null && saved;
  // pop sutil quando o valor muda (não no primeiro render).
  const [pop, setPop] = useState(false);
  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    setPop(true);
    const t = setTimeout(() => setPop(false), 240);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="flex flex-col items-center gap-1">
      {!locked && (
        <button
          type="button"
          aria-label="Aumentar"
          onClick={() => onBump(1)}
          className="grid h-5 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted"
        >
          <Plus className="size-3.5" />
        </button>
      )}
      <div
        className={cn(
          "grid size-10 place-items-center rounded-xl text-xl font-extrabold tabular-nums transition-colors",
          filled
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-secondary text-secondary-foreground",
          pop && "animate-pop",
        )}
      >
        {value ?? "–"}
      </div>
      {!locked && (
        <button
          type="button"
          aria-label="Diminuir"
          onClick={() => onBump(-1)}
          className="grid h-5 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted"
        >
          <Minus className="size-3.5" />
        </button>
      )}
    </div>
  );
}
