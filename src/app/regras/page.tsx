import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Lock, Medal, Sparkles, Target, Trophy, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Regras · Bolão Copa 2026",
  description:
    "Como funciona o bolão da Copa 2026: pontuação por jogo, multiplicadores do mata-mata, bônus do torneio e desempates.",
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex flex-none items-center rounded-full bg-primary/10 px-2.5 py-1 text-sm font-extrabold tabular-nums text-primary">
      {children}
    </span>
  );
}

function Rule({
  label,
  hint,
  chip,
}: {
  label: string;
  hint?: string;
  chip: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Chip>{chip}</Chip>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function RegrasPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8">
      <div className="mb-7">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Trophy className="size-4" />
          </span>
          <span className="font-serif text-base font-semibold tracking-tight">
            S.M.M.A
          </span>
        </Link>
      </div>

      <h1 className="font-serif text-3xl italic">Como funciona</h1>
      <p className="mt-2 text-pretty text-muted-foreground">
        Você palpita no placar dos jogos e nos bônus do torneio. Vale só o
        resultado dos <strong className="text-foreground">90 minutos</strong> —
        prorrogação e pênaltis não contam.
      </p>

      <Section icon={<Target className="size-5" />} title="Pontos por jogo">
        <div className="divide-y divide-border">
          <Rule label="Cravou o placar exato" chip="10" />
          <Rule
            label="Acertou o vencedor e o saldo de gols"
            hint="ex.: você 2×0, deu 3×1"
            chip="6"
          />
          <Rule
            label="Acertou só o resultado"
            hint="quem ganhou — ou empate — mas o saldo errou"
            chip="3"
          />
          <Rule label="Errou" chip="0" />
        </div>
      </Section>

      <Section icon={<Crown className="size-5" />} title="Mata-mata vale mais">
        <p className="mb-3 text-sm text-muted-foreground">
          No mata-mata, os pontos do jogo são multiplicados. Cravar a final, por
          exemplo, vale <strong className="text-foreground">10 × 4 = 40</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            ["Grupos", "×1"],
            ["16-avos", "×1,5"],
            ["Oitavas", "×2"],
            ["Quartas", "×2,5"],
            ["Semis e 3º", "×3"],
            ["Final", "×4"],
          ].map(([stage, mult]) => (
            <div
              key={stage}
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{stage}</span>
              <span className="font-extrabold text-primary">{mult}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<Sparkles className="size-5" />} title="Bônus do torneio">
        <p className="mb-1 text-sm text-muted-foreground">
          Apostas do campeonato inteiro — valem como tempero e desempate.
          Travam no apito do 1º jogo da Copa.
        </p>
        <div className="divide-y divide-border">
          <Rule label="Campeão" chip="12" />
          <Rule label="Vice-campeão" chip="6" />
          <Rule label="Artilheiro" chip="6" />
          <Rule
            label="Revelação"
            hint="seleção fora do top 20 do ranking FIFA que for mais longe (mínimo: 16-avos)"
            chip="4"
          />
          <Rule
            label="Classificados de cada grupo"
            hint="acerte a dupla que avança — a ordem não importa"
            chip="+1"
          />
        </div>
      </Section>

      <Section icon={<Medal className="size-5" />} title="Desempates">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">No ranking geral:</strong> quem
            tem mais <em>cravadas</em> (placares exatos) fica na frente.
          </li>
          <li>
            <strong className="text-foreground">Na revelação:</strong> mais
            pontos → melhor saldo → mais gols → pior ranking FIFA.
          </li>
        </ul>
      </Section>

      <Section icon={<Lock className="size-5" />} title="Prazos e integridade">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">
              Cada palpite trava no apito do jogo
            </strong>{" "}
            — e só aí vira público. Antes disso, ninguém vê o que você palpitou.
          </li>
          <li>
            <strong className="text-foreground">Os bônus travam</strong> no 1º
            jogo da Copa.
          </li>
          <li className="flex items-start gap-1.5">
            <Users className="mt-0.5 size-4 flex-none text-primary" />
            Depois de travado, ninguém edita. A integridade é garantida no banco
            de dados.
          </li>
        </ul>
      </Section>

    </main>
  );
}
