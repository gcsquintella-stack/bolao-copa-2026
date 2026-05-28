import { redirect } from "next/navigation";
import { LogOut, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarded, role")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarded) redirect("/onboarding");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Trophy className="size-4" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">
                S.M.M.A
              </span>
              <span className="text-xs text-muted-foreground">
                {profile.display_name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ModeToggle />
            <form action={signOut}>
              <Button variant="ghost" size="icon" aria-label="Sair">
                <LogOut className="size-5" />
              </Button>
            </form>
          </div>
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 pb-2">
          <AppNav isAdmin={profile.role === "admin"} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
