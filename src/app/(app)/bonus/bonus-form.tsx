"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Lock } from "lucide-react";
import { saveBonus, type BonusPayload } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BonusTeam = {
  id: number;
  name: string;
  flag: string | null;
  group_label: string | null;
};

type Props = {
  teams: BonusTeam[];
  initial: {
    champion: number | null;
    runnerUp: number | null;
    surprise: number | null;
    topScorer: string;
    groups: Record<string, { a: number | null; b: number | null }>;
  };
  locked: boolean;
};

function TeamSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  options: BonusTeam[];
  disabled: boolean;
}) {
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm disabled:opacity-50"
    >
      <option value="">—</option>
      {options.map((t) => (
        <option key={t.id} value={t.id}>
          {(t.flag ? t.flag + " " : "") + t.name}
        </option>
      ))}
    </select>
  );
}

export function BonusForm({ teams, initial, locked }: Props) {
  const [champion, setChampion] = useState(initial.champion);
  const [runnerUp, setRunnerUp] = useState(initial.runnerUp);
  const [surprise, setSurprise] = useState(initial.surprise);
  const [topScorer, setTopScorer] = useState(initial.topScorer);
  const [groups, setGroups] = useState(initial.groups);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const byGroup = useMemo(() => {
    const m: Record<string, BonusTeam[]> = {};
    for (const t of teams) {
      if (!t.group_label) continue;
      (m[t.group_label] ??= []).push(t);
    }
    return m;
  }, [teams]);
  const groupLetters = Object.keys(byGroup).sort();

  function setGroupPick(g: string, side: "a" | "b", v: number | null) {
    setGroups((s) => ({ ...s, [g]: { ...s[g], [side]: v } }));
  }

  function save() {
    const payload: BonusPayload = {
      champion,
      runnerUp,
      surprise,
      topScorer,
      groups: groupLetters.map((g) => ({ group: g, a: groups[g]?.a ?? null, b: groups[g]?.b ?? null })),
    };
    start(async () => {
      const r = await saveBonus(payload);
      setMsg(r.error ? `erro: ${r.error}` : "palpites bônus salvos ✓");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {locked && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 p-3 text-sm text-muted-foreground">
          <Lock className="size-4" />
          A Copa começou — os palpites bônus estão travados.
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Palpites do torneio</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">🏆 Campeão</Label>
            <TeamSelect value={champion} onChange={setChampion} options={teams} disabled={locked} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">🥈 Vice</Label>
            <TeamSelect value={runnerUp} onChange={setRunnerUp} options={teams} disabled={locked} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">✨ Revelação</Label>
            <TeamSelect value={surprise} onChange={setSurprise} options={teams} disabled={locked} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scorer" className="text-xs">⚽ Artilheiro</Label>
            <Input
              id="scorer"
              value={topScorer}
              onChange={(e) => setTopScorer(e.target.value)}
              placeholder="Nome do jogador"
              disabled={locked}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Classificados de cada grupo (os 2 que avançam)
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {groupLetters.map((g) => (
            <div key={g} className="rounded-xl border border-border bg-card/50 p-3">
              <div className="mb-2 text-xs font-semibold">Grupo {g}</div>
              <div className="flex gap-2">
                <TeamSelect
                  value={groups[g]?.a ?? null}
                  onChange={(v) => setGroupPick(g, "a", v)}
                  options={byGroup[g]}
                  disabled={locked}
                />
                <TeamSelect
                  value={groups[g]?.b ?? null}
                  onChange={(v) => setGroupPick(g, "b", v)}
                  options={byGroup[g]}
                  disabled={locked}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {!locked && (
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Salvar palpites bônus
          </Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      )}
    </div>
  );
}
