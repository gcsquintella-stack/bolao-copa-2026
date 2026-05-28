import Link from "next/link";
import { Activity, Lock, ShieldCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

const features = [
  {
    icon: Trophy,
    title: "Ranking ao vivo",
    description: "A pontuação atualiza sozinha assim que o jogo acaba.",
  },
  {
    icon: Lock,
    title: "Palpites travados no apito",
    description: "Ninguém edita depois do início. Garantido no banco de dados.",
  },
  {
    icon: ShieldCheck,
    title: "Integridade sagrada",
    description: "Seu palpite fica oculto até a bola rolar. Sem trapaça.",
  },
  {
    icon: Activity,
    title: "104 jogos, 1 disputa",
    description: "Da fase de grupos à final, com bônus e viradas no ranking.",
  },
];

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Glow de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 22%, transparent), transparent 70%)",
        }}
      />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Trophy className="size-4.5" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight">S.M.M.A</span>
            <span className="text-xs text-muted-foreground">Bolão Copa 2026</span>
          </div>
        </div>
        <ModeToggle />
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur">
          <span className="size-2 rounded-full bg-primary" />
          Copa do Mundo FIFA 2026 · 11 jun – 19 jul
        </span>

        <h1 className="mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          O bolão da Copa entre amigos,{" "}
          <span className="text-primary">feito bem feito.</span>
        </h1>

        <p className="mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
          Entre por um link, palpite em menos de um minuto e dispute o ranking ao
          vivo até a final. Mobile-first, sem senha, sem complicação.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button render={<Link href="/login" />} size="lg" className="px-8">
            Entrar no bolão
          </Button>
          <Button
            render={<Link href="/login" />}
            size="lg"
            variant="outline"
            className="px-8"
          >
            Como funciona
          </Button>
        </div>

        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card/50 p-5 text-left backdrop-blur transition-colors hover:border-primary/50"
            >
              <Icon className="size-6 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 py-8 text-center text-sm text-muted-foreground">
        Em construção · Fase 1 — scaffold no ar
      </footer>
    </main>
  );
}
