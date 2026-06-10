import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { Leaderboard, type LeaderRow } from "@/components/ranking/leaderboard";
import { parseScoringConfig } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, { data: cfg }] = await Promise.all([
    supabase
      .from("leaderboard")
      .select("user_id, display_name, total_points, exact_count")
      .order("total_points", { ascending: false })
      .order("exact_count", { ascending: false }),
    supabase.from("scoring_config").select("*").eq("id", true).single(),
  ]);

  const rows = (data ?? []) as LeaderRow[];
  const scoring = parseScoringConfig(cfg);

  return (
    <div className="flex flex-col gap-5">
      <RealtimeRefresher />
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ranking</h1>
        <p className="text-sm text-muted-foreground">
          Atualiza sozinho quando sai um resultado. Desempate: nº de cravadas.
        </p>
      </header>

      <Leaderboard rows={rows} meId={user?.id ?? null} scoring={scoring} />
    </div>
  );
}
