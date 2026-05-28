import { createClient } from "@/lib/supabase/server";
import { ResultadosClient } from "../resultados-client";
import type { MatchRow, TeamRef } from "@/components/jogos/types";

export const dynamic = "force-dynamic";

function one(v: unknown): TeamRef {
  const t = Array.isArray(v) ? v[0] : v;
  if (!t) return null;
  const r = t as { name: string; code: string | null; flag: string | null };
  return { name: r.name, code: r.code, flag: r.flag };
}

export default async function AdminResultadosPage() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("matches")
    .select(
      "id, stage, group_label, home_label, away_label, kickoff_at, venue, status, home_score, away_score, home:teams!home_team_id(name,code,flag), away:teams!away_team_id(name,code,flag)",
    )
    .order("kickoff_at", { ascending: true })
    .order("id", { ascending: true });

  const matches: MatchRow[] = (raw ?? []).map((m) => ({
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lançar resultados</h1>
        <p className="text-sm text-muted-foreground">
          Placar do tempo normal (90 min). Salvar dispara a apuração e atualiza o
          ranking na hora.
        </p>
      </div>
      <ResultadosClient matches={matches} />
    </div>
  );
}
