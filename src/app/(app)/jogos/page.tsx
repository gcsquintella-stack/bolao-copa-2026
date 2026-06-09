import { createClient } from "@/lib/supabase/server";
import { JogosClient } from "@/components/jogos/jogos-client";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import type { MatchRow, PredictionRow, TeamRef } from "@/components/jogos/types";
import { parseScoringConfig } from "@/lib/scoring";

export const dynamic = "force-dynamic";

function one(v: unknown): TeamRef {
  const t = Array.isArray(v) ? v[0] : v;
  if (!t) return null;
  const r = t as { name: string; code: string | null; flag: string | null };
  return { name: r.name, code: r.code, flag: r.flag };
}

export default async function JogosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: rawMatches }, { data: preds }, { data: cfg }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, stage, group_label, home_label, away_label, kickoff_at, venue, status, home_score, away_score, home:teams!home_team_id(name,code,flag), away:teams!away_team_id(name,code,flag)",
        )
        .order("kickoff_at", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("predictions")
        .select("match_id, home_score, away_score, points")
        .eq("user_id", user!.id),
      supabase.from("scoring_config").select("*").eq("id", true).single(),
    ]);

  const scoring = parseScoringConfig(cfg);

  const matches: MatchRow[] = (rawMatches ?? []).map((m) => ({
    id: m.id,
    stage: m.stage,
    group_label: m.group_label,
    home: one(m.home),
    away: one(m.away),
    home_label: m.home_label,
    away_label: m.away_label,
    kickoff_at: m.kickoff_at,
    venue: m.venue,
    status: m.status,
    home_score: m.home_score,
    away_score: m.away_score,
  }));

  const predictions = (preds ?? []) as PredictionRow[];

  return (
    <div className="flex flex-col gap-4">
      <RealtimeRefresher />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Jogos</h1>
        <p className="text-sm text-muted-foreground">
          Palpite no placar. O campo trava no apito — e aí seu palpite vira
          público.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Os jogos ainda não foram carregados. (Rode o seed da fixture.)
        </div>
      ) : (
        <JogosClient
          matches={matches}
          predictions={predictions}
          userId={user!.id}
          scoring={scoring}
        />
      )}
    </div>
  );
}
