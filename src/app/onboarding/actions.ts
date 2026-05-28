"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string };

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (displayName.length < 2) {
    return { error: "Escolha um nome com pelo menos 2 caracteres." };
  }
  if (displayName.length > 40) {
    return { error: "Nome muito longo (máx. 40 caracteres)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, onboarded: true })
    .eq("id", user.id);

  if (error) return { error: error.message };

  redirect("/jogos");
}
