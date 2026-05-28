"use client";

import { useState, useTransition } from "react";
import { Loader2, Lock } from "lucide-react";
import { updateScoring, type ScoringValues } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SECTIONS: { title: string; fields: { key: keyof ScoringValues; label: string; step?: number }[] }[] = [
  {
    title: "Pontuação base (por jogo)",
    fields: [
      { key: "points_exact", label: "Cravada (placar exato)" },
      { key: "points_winner_goaldiff", label: "Vencedor + saldo de gols" },
      { key: "points_winner_only", label: "Só o resultado" },
    ],
  },
  {
    title: "Multiplicadores do mata-mata",
    fields: [
      { key: "mult_r32", label: "16-avos (R32)", step: 0.5 },
      { key: "mult_r16", label: "Oitavas", step: 0.5 },
      { key: "mult_qf", label: "Quartas", step: 0.5 },
      { key: "mult_sf", label: "Semis + 3º lugar", step: 0.5 },
      { key: "mult_final", label: "Final", step: 0.5 },
    ],
  },
  {
    title: "Bônus",
    fields: [
      { key: "bonus_group_qualifier", label: "Classificado de grupo (cada)" },
      { key: "bonus_champion", label: "Campeão" },
      { key: "bonus_runner_up", label: "Vice" },
      { key: "bonus_top_scorer", label: "Artilheiro" },
      { key: "bonus_surprise", label: "Revelação" },
    ],
  },
];

export function ScoringForm({
  initial,
  locked,
}: {
  initial: ScoringValues;
  locked: boolean;
}) {
  const [values, setValues] = useState<ScoringValues>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function set(key: keyof ScoringValues, v: string) {
    setValues((s) => ({ ...s, [key]: Number(v) }));
  }

  function save() {
    start(async () => {
      const r = await updateScoring(values);
      setMsg(r.error ? `erro: ${r.error}` : "pontuação salva ✓");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {locked && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 p-3 text-sm text-muted-foreground">
          <Lock className="size-4" />
          O torneio já começou — a pontuação está travada e não pode mais mudar.
        </div>
      )}

      {SECTIONS.map((section) => (
        <div key={section.title} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {section.title}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {section.fields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <Label htmlFor={f.key} className="text-xs">
                  {f.label}
                </Label>
                <Input
                  id={f.key}
                  type="number"
                  step={f.step ?? 1}
                  min={0}
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  disabled={locked}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={locked || pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Salvar pontuação
        </Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}
