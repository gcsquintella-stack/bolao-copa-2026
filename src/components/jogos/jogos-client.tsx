"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MatchCard } from "./match-card";
import type { MatchRow, PredictionRow } from "./types";
import type { ScoringConfig } from "@/lib/scoring";
import { nowMs, nowDate } from "@/lib/time";

type Filter = "todos" | "hoje" | "live" | "abertos" | "salvos" | "encerrados";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "hoje", label: "Hoje" },
  { key: "live", label: "Ao vivo" },
  { key: "abertos", label: "Abertos" },
  { key: "salvos", label: "Salvos" },
  { key: "encerrados", label: "Encerrados" },
];

const brtDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const brtHeader = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "long",
  day: "2-digit",
  month: "long",
});

function matchText(m: MatchRow) {
  return [m.home?.name, m.away?.name, m.home_label, m.away_label]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function JogosClient({
  matches,
  predictions,
  userId,
  scoring,
}: {
  matches: MatchRow[];
  predictions: PredictionRow[];
  userId: string;
  scoring: ScoringConfig;
}) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");

  const predByMatch = useMemo(() => {
    const map = new Map<number, PredictionRow>();
    for (const p of predictions) map.set(p.match_id, p);
    return map;
  }, [predictions]);

  const todayBrt = brtDate.format(nowDate());

  const visible = useMemo(() => {
    const now = nowMs();
    const q = query.trim().toLowerCase();
    return matches.filter((m) => {
      const ts = new Date(m.kickoff_at).getTime();
      const locked = now >= ts;
      if (filter === "hoje" && brtDate.format(new Date(m.kickoff_at)) !== todayBrt)
        return false;
      if (filter === "live" && m.status !== "live") return false;
      if (filter === "abertos" && locked) return false;
      if (filter === "encerrados" && !locked) return false;
      if (filter === "salvos" && !predByMatch.has(m.id)) return false;
      if (q && !matchText(m).includes(q)) return false;
      return true;
    });
  }, [matches, filter, query, predByMatch, todayBrt]);

  // agrupa por dia (Brasília)
  const groups = useMemo(() => {
    const out: { day: string; label: string; items: MatchRow[] }[] = [];
    for (const m of visible) {
      const day = brtDate.format(new Date(m.kickoff_at));
      let g = out.find((x) => x.day === day);
      if (!g) {
        g = { day, label: brtHeader.format(new Date(m.kickoff_at)), items: [] };
        out.push(g);
      }
      g.items.push(m);
    }
    return out;
  }, [visible]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar seleção…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhum jogo nesse filtro.
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.day} className="flex flex-col gap-3">
            <h2 className="px-1 text-sm font-semibold capitalize text-muted-foreground">
              {g.label}
            </h2>
            {g.items.map((m, i) => (
              <div
                key={m.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
              >
                <MatchCard
                  match={m}
                  initial={predByMatch.get(m.id) ?? null}
                  userId={userId}
                  scoring={scoring}
                />
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
