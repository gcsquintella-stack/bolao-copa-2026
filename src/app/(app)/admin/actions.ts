"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

async function assertAdmin(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const { data: p } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (p?.role !== "admin") throw new Error("Apenas admin.");
}

export type ActionResult = { ok?: boolean; error?: string };

export async function setResult(
  matchId: number,
  home: number,
  away: number,
): Promise<ActionResult> {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const { error } = await supabase
    .from("matches")
    .update({ home_score: home, away_score: away, status: "finished" })
    .eq("id", matchId);
  if (error) return { error: error.message };
  revalidatePath("/admin/resultados");
  revalidatePath("/ranking");
  revalidatePath("/jogos");
  return { ok: true };
}

export async function clearResult(matchId: number): Promise<ActionResult> {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const { error } = await supabase
    .from("matches")
    .update({ home_score: null, away_score: null, status: "scheduled" })
    .eq("id", matchId);
  if (error) return { error: error.message };
  revalidatePath("/admin/resultados");
  revalidatePath("/ranking");
  revalidatePath("/jogos");
  return { ok: true };
}

export type ScoringValues = {
  points_exact: number;
  points_winner_goaldiff: number;
  points_winner_only: number;
  mult_r32: number;
  mult_r16: number;
  mult_qf: number;
  mult_sf: number;
  mult_final: number;
  bonus_group_qualifier: number;
  bonus_champion: number;
  bonus_runner_up: number;
  bonus_top_scorer: number;
  bonus_surprise: number;
};

export async function updateScoring(
  values: ScoringValues,
): Promise<ActionResult> {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const { error } = await supabase
    .from("scoring_config")
    .update(values)
    .eq("id", true);
  if (error) return { error: error.message };
  revalidatePath("/admin/pontuacao");
  return { ok: true };
}
