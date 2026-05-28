"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BonusPayload = {
  champion: number | null;
  runnerUp: number | null;
  surprise: number | null;
  topScorer: string;
  groups: { group: string; a: number | null; b: number | null }[];
};

export async function saveBonus(p: BonusPayload): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error: e1 } = await supabase.from("bonus_predictions").upsert({
    user_id: user.id,
    champion_team_id: p.champion,
    runner_up_team_id: p.runnerUp,
    surprise_team_id: p.surprise,
    top_scorer: p.topScorer.trim() || null,
  });
  if (e1) return { error: e1.message };

  const rows = p.groups
    .filter((g) => g.a && g.b && g.a !== g.b)
    .map((g) => ({ user_id: user.id, group_label: g.group, team_a_id: g.a, team_b_id: g.b }));
  if (rows.length) {
    const { error: e2 } = await supabase.from("bonus_group_predictions").upsert(rows);
    if (e2) return { error: e2.message };
  }

  revalidatePath("/bonus");
  return { ok: true };
}
