import { createClient } from "@/lib/supabase/server";
import { BonusAdminForm } from "./bonus-admin-form";
import type { TeamOption } from "@/components/ui/team-select";

export const dynamic = "force-dynamic";

export default async function AdminBonusPage() {
  const supabase = await createClient();

  const [{ data: teams }, { data: outcome }] = await Promise.all([
    supabase.from("teams").select("id, name, code, flag").order("name"),
    supabase.from("tournament_outcome").select("*").eq("id", true).single(),
  ]);

  const initial = {
    champion: outcome?.champion_team_id ?? null,
    runnerUp: outcome?.runner_up_team_id ?? null,
    surprise: outcome?.surprise_team_id ?? null,
    topScorer: outcome?.top_scorer ?? "",
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bônus — respostas oficiais
        </h1>
        <p className="text-sm text-muted-foreground">
          Conforme o torneio se define, registre os resultados reais dos bônus e
          clique em apurar. A pontuação e o ranking atualizam na hora.
        </p>
      </div>
      <BonusAdminForm teams={(teams ?? []) as TeamOption[]} initial={initial} />
    </div>
  );
}
