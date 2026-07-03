"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Standings } from "./standings";
import { BracketTree, type BracketData } from "./bracket-tree";
import type { StandingRow } from "@/lib/standings";

export function CopaTabs({
  groups,
  bracket,
}: {
  groups: { group: string; rows: StandingRow[] }[];
  bracket: BracketData;
}) {
  const [tab, setTab] = useState<"grupos" | "mata">("grupos");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-xl bg-secondary p-1">
        {(["grupos", "mata"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
              tab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "grupos" ? "Grupos" : "Mata-mata"}
          </button>
        ))}
      </div>

      {tab === "grupos" ? (
        <Standings groups={groups} />
      ) : (
        <BracketTree data={bracket} />
      )}
    </div>
  );
}
