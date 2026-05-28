import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarded")
    .eq("id", user.id)
    .single();

  if (profile?.onboarded) redirect("/jogos");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 22%, transparent), transparent 70%)",
        }}
      />
      <div className="mb-8 flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Trophy className="size-4.5" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold tracking-tight">S.M.M.A</span>
          <span className="text-xs text-muted-foreground">Bolão Copa 2026</span>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Quase lá!</CardTitle>
          <CardDescription>
            Escolha o nome que vai aparecer no ranking pros amigos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm defaultName={profile?.display_name ?? ""} />
        </CardContent>
      </Card>
    </main>
  );
}
