import { CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function JogosPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Jogos</h1>
        <p className="text-sm text-muted-foreground">
          Em breve: seus palpites, filtros e a trava no apito.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="size-5 text-primary" />
            Tela de palpites — Fase 4
          </CardTitle>
          <CardDescription>
            Você está logado e dentro da área protegida. 🎉 A lista dos 104 jogos
            e os campos de palpite chegam na próxima fase.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Por enquanto, isto confirma que login, onboarding e proteção de rota
          estão funcionando.
        </CardContent>
      </Card>
    </div>
  );
}
