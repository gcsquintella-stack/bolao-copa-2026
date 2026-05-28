import Link from "next/link";
import { ListChecks, SlidersHorizontal } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ITEMS = [
  {
    href: "/admin/resultados",
    icon: ListChecks,
    title: "Lançar resultados",
    desc: "Registre o placar dos jogos. A apuração e o ranking atualizam sozinhos.",
  },
  {
    href: "/admin/pontuacao",
    icon: SlidersHorizontal,
    title: "Pontuação",
    desc: "Ajuste pontos e multiplicadores (até o 1º jogo).",
  },
];

export default function AdminHome() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel do comissário</h1>
        <p className="text-sm text-muted-foreground">
          Ferramentas de administração do bolão.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ITEMS.map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="size-5 text-primary" />
                  {title}
                </CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
