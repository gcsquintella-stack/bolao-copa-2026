import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { CopaTabs } from "@/components/copa/copa-tabs";
import {
  computeStandings,
  type StandingMatch,
  type StandingTeam,
} from "@/lib/standings";
import type { MatchRow, TeamRef } from "@/components/jogos/types";

export const dynamic = "force-dynamic";

function one(v: unknown): TeamRef {
  const t = Array.isArray(v) ? v[0] : v;
  if (!t) return null;
  const r = t as { name: string; code: string | null; flag: string | null };
  return { name: r.name, code: r.code, flag: r.flag };
}

export default async function CopaPage() {
  const supabase = await createClient();

  const [{ data: teams }, { data: groupMatches }, { data: koRaw }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, name, code, group_label")
        .order("group_label")
        .order("name"),
      supabase
        .from("matches")
        .select("home_team_id, away_team_id, home_score, away_score, status")
        .eq("stage", "group"),
      supabase
        .from("matches")
        .select(
          "id, stage, group_label, home_label, away_label, kickoff_at, venue, status, home_score, away_score, home:teams!home_team_id(name,code,flag), away:teams!away_team_id(name,code,flag)",
        )
        .neq("stage", "group")
        .order("id", { ascending: true }),
    ]);

  const groups = computeStandings(
    (teams ?? []) as StandingTeam[],
    (groupMatches ?? []) as StandingMatch[],
  );

  const knockout: MatchRow[] = (koRaw ?? []).map((m) => ({
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

  return (
    <div className="flex flex-col gap-5">
      <RealtimeRefresher />
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Copa</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe a Copa: classificação dos grupos e o chaveamento do
          mata-mata, ao vivo.
        </p>
      </header>

      <CopaTabs groups={groups} knockout={knockout} />
    </div>
  );
}
