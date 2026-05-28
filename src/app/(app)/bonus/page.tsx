import { createClient } from "@/lib/supabase/server";
import { BonusForm, type BonusTeam } from "./bonus-form";

export const dynamic = "force-dynamic";

export default async function BonusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: teams }, { data: bp }, { data: bg }, { data: first }] =
    await Promise.all([
      supabase.from("teams").select("id, name, flag, group_label").order("group_label").order("name"),
      supabase.from("bonus_predictions").select("*").eq("user_id", user!.id).maybeSingle(),
      supabase.from("bonus_group_predictions").select("group_label, team_a_id, team_b_id").eq("user_id", user!.id),
      supabase.from("matches").select("kickoff_at").order("kickoff_at", { ascending: true }).limit(1).single(),
    ]);

  const locked = first ? Date.now() >= new Date(first.kickoff_at).getTime() : false;

  const groups: Record<string, { a: number | null; b: number | null }> = {};
  for (const row of bg ?? []) {
    groups[row.group_label] = { a: row.team_a_id, b: row.team_b_id };
  }

  const initial = {
    champion: bp?.champion_team_id ?? null,
    runnerUp: bp?.runner_up_team_id ?? null,
    surprise: bp?.surprise_team_id ?? null,
    topScorer: bp?.top_scorer ?? "",
    groups,
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Palpites bônus</h1>
        <p className="text-sm text-muted-foreground">
          Apostas do torneio inteiro. Travam no apito da abertura. Valem como
          desempate: campeão 12 · vice 6 · artilheiro 6 · revelação 4 ·
          classificado +1.
        </p>
      </div>
      <BonusForm teams={(teams ?? []) as BonusTeam[]} initial={initial} locked={locked} />
    </div>
  );
}
