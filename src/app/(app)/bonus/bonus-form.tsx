"use client";

import {
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Loader2, Lock, Medal, Sparkles, Target, Trophy } from "lucide-react";
import { saveBonus, type BonusPayload } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamSelect } from "@/components/ui/team-select";

export type BonusTeam = {
  id: number;
  name: string;
  code: string | null;
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

function Field({
  icon,
  label,
  hint,
  children,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
        <span className="ml-auto rounded-full bg-secondary px-2 py-px text-[10px] font-bold text-secondary-foreground">
          {hint}
        </span>
      </span>
      {children}
    </div>
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
      groups: groupLetters.map((g) => ({
        group: g,
        a: groups[g]?.a ?? null,
        b: groups[g]?.b ?? null,
      })),
    };
    start(async () => {
      const r = await saveBonus(payload);
      setMsg(r.error ? `erro: ${r.error}` : "palpites bônus salvos");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {locked && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 p-3 text-sm text-muted-foreground">
          <Lock className="size-4 flex-none" />
          A Copa começou — os palpites bônus estão travados.
        </div>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Palpites do torneio</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            icon={<Trophy className="size-3.5" />}
            label="Campeão"
            hint="12 pts"
          >
            <TeamSelect
              value={champion}
              onChange={setChampion}
              options={teams}
              disabled={locked}
            />
          </Field>
          <Field
            icon={<Medal className="size-3.5" />}
            label="Vice"
            hint="6 pts"
          >
            <TeamSelect
              value={runnerUp}
              onChange={setRunnerUp}
              options={teams}
              disabled={locked}
            />
          </Field>
          <Field
            icon={<Sparkles className="size-3.5" />}
            label="Revelação"
            hint="4 pts"
          >
            <TeamSelect
              value={surprise}
              onChange={setSurprise}
              options={teams}
              disabled={locked}
            />
          </Field>
          <Field
            icon={<Target className="size-3.5" />}
            label="Artilheiro"
            hint="6 pts"
          >
            <Input
              value={topScorer}
              onChange={(e) => setTopScorer(e.target.value)}
              placeholder="Nome do jogador"
              disabled={locked}
              className="h-10 rounded-xl"
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-semibold text-muted-foreground">
          Classificados de cada grupo ·{" "}
          <span className="text-primary">+1 por acerto</span>
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {groupLetters.map((g) => (
            <div
              key={g}
              className="rounded-2xl border border-border bg-card p-3 shadow-sm"
            >
              <div className="mb-2 text-xs font-bold text-muted-foreground">
                Grupo {g}
              </div>
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
      </section>

      {!locked && (
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending} className="rounded-xl">
            {pending && <Loader2 className="size-4 animate-spin" />}
            Salvar palpites bônus
          </Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      )}
    </div>
  );
}
