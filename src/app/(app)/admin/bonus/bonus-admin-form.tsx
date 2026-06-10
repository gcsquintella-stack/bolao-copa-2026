"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  Calculator,
  Loader2,
  Medal,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { setOutcome, runScoreBonus } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamSelect, type TeamOption } from "@/components/ui/team-select";

type Props = {
  teams: TeamOption[];
  initial: {
    champion: number | null;
    runnerUp: number | null;
    surprise: number | null;
    topScorer: string;
  };
};

function Field({
  icon,
  label,
  hint,
  onClear,
  children,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  onClear?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
        <span className="ml-auto flex items-center gap-2">
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] font-medium underline-offset-2 hover:text-foreground hover:underline"
            >
              limpar
            </button>
          )}
          <span className="rounded-full bg-secondary px-2 py-px text-[10px] font-bold text-secondary-foreground">
            {hint}
          </span>
        </span>
      </span>
      {children}
    </div>
  );
}

export function BonusAdminForm({ teams, initial }: Props) {
  const [champion, setChampion] = useState(initial.champion);
  const [runnerUp, setRunnerUp] = useState(initial.runnerUp);
  const [surprise, setSurprise] = useState(initial.surprise);
  const [topScorer, setTopScorer] = useState(initial.topScorer);
  const [msg, setMsg] = useState<string | null>(null);
  const [scoreMsg, setScoreMsg] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [scoring, startScore] = useTransition();

  function save() {
    startSave(async () => {
      const r = await setOutcome({
        champion_team_id: champion,
        runner_up_team_id: runnerUp,
        surprise_team_id: surprise,
        top_scorer: topScorer.trim() || null,
      });
      setMsg(r.error ? `erro: ${r.error}` : "respostas salvas ✓");
    });
  }

  function apurar() {
    startScore(async () => {
      const r = await runScoreBonus();
      setScoreMsg(
        r.error ? `erro: ${r.error}` : "bônus apurados — ranking atualizado ✓",
      );
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Resultados do torneio</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            icon={<Trophy className="size-3.5" />}
            label="Campeão"
            hint="12 pts"
            onClear={champion != null ? () => setChampion(null) : undefined}
          >
            <TeamSelect value={champion} onChange={setChampion} options={teams} />
          </Field>
          <Field
            icon={<Medal className="size-3.5" />}
            label="Vice"
            hint="6 pts"
            onClear={runnerUp != null ? () => setRunnerUp(null) : undefined}
          >
            <TeamSelect value={runnerUp} onChange={setRunnerUp} options={teams} />
          </Field>
          <Field
            icon={<Sparkles className="size-3.5" />}
            label="Revelação"
            hint="opcional · auto"
            onClear={surprise != null ? () => setSurprise(null) : undefined}
          >
            <TeamSelect
              value={surprise}
              onChange={setSurprise}
              options={teams}
              placeholder="Automático…"
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
              className="h-10 rounded-xl"
            />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Revelação em branco = cálculo automático (melhor seleção fora do top 20
          do ranking FIFA que foi mais longe). Os classificados de grupo (+1
          cada) são marcados na próxima etapa.
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving} className="rounded-xl">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Salvar respostas
          </Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Apurar bônus</h2>
        <p className="text-xs text-muted-foreground">
          Recalcula os pontos de bônus de todos os jogadores a partir das
          respostas acima (e dos classificados de grupo) e atualiza o ranking. É
          seguro rodar quantas vezes quiser.
        </p>
        <div className="flex items-center gap-3">
          <Button
            onClick={apurar}
            disabled={scoring}
            variant="secondary"
            className="rounded-xl"
          >
            {scoring ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Calculator className="size-4" />
            )}
            Apurar bônus
          </Button>
          {scoreMsg && (
            <span className="text-sm text-muted-foreground">{scoreMsg}</span>
          )}
        </div>
      </section>
    </div>
  );
}
