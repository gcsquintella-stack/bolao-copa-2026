import { LogOut, Trophy } from "lucide-react";
import { signOut } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { AppNav } from "@/components/app-nav";

// Esqueleto do app: cabeçalho (marca + tema + sair) e a navegação por abas.
// Compartilhado entre o layout do grupo (app) e a página /regras (que é pública
// e vive fora do grupo, mas precisa da navegação quando o usuário está logado).
export function AppShell({
  displayName,
  isAdmin,
  children,
}: {
  displayName: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Trophy className="size-4" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-serif text-base font-semibold tracking-tight">
                S.M.M.A
              </span>
              <span className="text-xs text-muted-foreground">{displayName}</span>
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
          <AppNav isAdmin={isAdmin} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
