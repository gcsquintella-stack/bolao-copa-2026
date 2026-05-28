"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { setResult, clearResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STAGE_LABEL, type MatchRow } from "@/components/jogos/types";

const brt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function name(t: MatchRow["home"], fallback: string | null) {
  return t ? `${t.flag ?? ""} ${t.name}`.trim() : (fallback ?? "A definir");
}

export function ResultRow({ match }: { match: MatchRow }) {
  const [home, setHome] = useState(match.home_score?.toString() ?? "");
  const [away, setAway] = useState(match.away_score?.toString() ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const hasResult = match.home_score != null && match.away_score != null;

  function save() {
    const h = Number(home);
    const a = Number(away);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) {
      setMsg("placar inválido");
      return;
    }
    start(async () => {
      const r = await setResult(match.id, h, a);
      setMsg(r.error ? `erro: ${r.error}` : "resultado salvo ✓");
    });
  }

  function clear() {
    start(async () => {
      const r = await clearResult(match.id);
      if (!r.error) {
        setHome("");
        setAway("");
      }
      setMsg(r.error ? `erro: ${r.error}` : "resultado removido");
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {match.stage === "group"
            ? `Grupo ${match.group_label}`
            : STAGE_LABEL[match.stage]}{" "}
          · #{match.id}
        </span>
        <span>{brt.format(new Date(match.kickoff_at))}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className="justify-self-start text-sm font-medium">
          {name(match.home, match.home_label)}
        </span>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            value={home}
            onChange={(e) => setHome(e.target.value)}
            className="h-9 w-12 text-center"
          />
          <span className="text-muted-foreground">×</span>
          <Input
            type="number"
            min={0}
            value={away}
            onChange={(e) => setAway(e.target.value)}
            className="h-9 w-12 text-center"
          />
        </div>
        <span className="justify-self-end text-right text-sm font-medium">
          {name(match.away, match.away_label)}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{msg}</span>
        <div className="flex items-center gap-2">
          {hasResult && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              disabled={pending}
              aria-label="Remover resultado"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
