"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MatchRow } from "@/components/jogos/types";
import { ResultRow } from "./result-row";
import { nowMs } from "@/lib/time";

type Filter = "comecaram" | "lancados" | "todos";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "comecaram", label: "Já começaram" },
  { key: "lancados", label: "Lançados" },
  { key: "todos", label: "Todos" },
];

function text(m: MatchRow) {
  return [m.home?.name, m.away?.name, m.home_label, m.away_label]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function ResultadosClient({ matches }: { matches: MatchRow[] }) {
  const [filter, setFilter] = useState<Filter>("comecaram");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const now = nowMs();
    const q = query.trim().toLowerCase();
    return matches.filter((m) => {
      const started = now >= new Date(m.kickoff_at).getTime();
      const hasResult = m.home_score != null && m.away_score != null;
      if (filter === "comecaram" && !started) return false;
      if (filter === "lancados" && !hasResult) return false;
      if (q && !text(m).includes(q)) return false;
      return true;
    });
  }, [matches, filter, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar seleção…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhum jogo nesse filtro.
        </div>
      ) : (
        visible.map((m) => <ResultRow key={m.id} match={m} />)
      )}
    </div>
  );
}
