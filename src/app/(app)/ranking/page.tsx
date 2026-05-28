import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresher } from "@/components/ranking/realtime-refresher";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = {
  user_id: string;
  display_name: string;
  total_points: number;
  exact_count: number;
};

function medal(pos: number) {
  return pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : null;
}

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("leaderboard")
    .select("user_id, display_name, total_points, exact_count")
    .order("total_points", { ascending: false })
    .order("exact_count", { ascending: false });

  const rows = (data ?? []) as Row[];

  return (
    <div className="flex flex-col gap-4">
      <RealtimeRefresher />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ranking</h1>
        <p className="text-sm text-muted-foreground">
          Atualiza sozinho quando sai um resultado. Desempate: nº de cravadas.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Ninguém pontuou ainda. A disputa começa quando rolar o primeiro jogo.
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => {
            const pos = i + 1;
            const me = r.user_id === user?.id;
            return (
              <li
                key={r.user_id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-3",
                  me && "border-primary/60 bg-primary/5",
                )}
              >
                <span className="w-7 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                  {medal(pos) ?? pos}
                </span>
                <span className="flex-1 font-medium">
                  {r.display_name}
                  {me && (
                    <span className="ml-2 text-xs text-primary">você</span>
                  )}
                </span>
                <span className="text-right text-xs text-muted-foreground">
                  {r.exact_count} crav.
                </span>
                <span className="w-16 text-right text-lg font-bold tabular-nums">
                  {r.total_points}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
