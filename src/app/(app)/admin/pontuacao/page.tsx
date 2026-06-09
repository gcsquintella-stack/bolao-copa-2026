import { createClient } from "@/lib/supabase/server";
import { ScoringForm } from "../scoring-form";
import type { ScoringValues } from "../actions";
import { tournamentStarted } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPontuacaoPage() {
  const supabase = await createClient();

  const { data: cfg } = await supabase
    .from("scoring_config")
    .select("*")
    .eq("id", true)
    .single();

  // torneio começou? (apito do 1º jogo) — trava a edição
  const { data: first } = await supabase
    .from("matches")
    .select("kickoff_at")
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .single();
  const locked = tournamentStarted(first?.kickoff_at);

  const initial: ScoringValues = {
    points_exact: cfg?.points_exact ?? 10,
    points_winner_goaldiff: cfg?.points_winner_goaldiff ?? 6,
    points_winner_only: cfg?.points_winner_only ?? 3,
    mult_r32: Number(cfg?.mult_r32 ?? 1.5),
    mult_r16: Number(cfg?.mult_r16 ?? 2),
    mult_qf: Number(cfg?.mult_qf ?? 2.5),
    mult_sf: Number(cfg?.mult_sf ?? 3),
    mult_final: Number(cfg?.mult_final ?? 4),
    bonus_group_qualifier: cfg?.bonus_group_qualifier ?? 3,
    bonus_champion: cfg?.bonus_champion ?? 30,
    bonus_runner_up: cfg?.bonus_runner_up ?? 15,
    bonus_top_scorer: cfg?.bonus_top_scorer ?? 15,
    bonus_surprise: cfg?.bonus_surprise ?? 10,
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pontuação</h1>
        <p className="text-sm text-muted-foreground">
          Ajuste os pontos e multiplicadores. Editável só até o apito do 1º jogo.
        </p>
      </div>
      <ScoringForm initial={initial} locked={locked} />
    </div>
  );
}
