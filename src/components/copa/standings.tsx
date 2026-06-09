import { Flag } from "@/components/ui/flag";
import { cn } from "@/lib/utils";
import type { StandingRow } from "@/lib/standings";

export function Standings({
  groups,
}: {
  groups: { group: string; rows: StandingRow[] }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {groups.map(({ group, rows }) => (
        <div
          key={group}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-bold">Grupo {group}</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              2 avançam
            </span>
          </div>
          <div className="p-1.5">
            <div className="flex items-center gap-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="w-4 text-center">#</span>
              <span className="flex-1">Seleção</span>
              <span className="w-6 text-center">J</span>
              <span className="w-7 text-center">SG</span>
              <span className="w-7 text-center">Pts</span>
            </div>
            {rows.map((r, i) => {
              const qualified = i < 2;
              return (
                <div
                  key={r.team.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5",
                    qualified && "bg-primary/[0.06]",
                  )}
                >
                  <span
                    className={cn(
                      "w-4 text-center text-xs font-bold tabular-nums",
                      qualified ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <Flag code={r.team.code} name={r.team.name} size={20} />
                  <span className="flex-1 truncate text-sm font-medium">
                    {r.team.name}
                  </span>
                  <span className="w-6 text-center text-xs tabular-nums text-muted-foreground">
                    {r.played}
                  </span>
                  <span className="w-7 text-center text-xs tabular-nums text-muted-foreground">
                    {r.gd > 0 ? `+${r.gd}` : r.gd}
                  </span>
                  <span className="w-7 text-center text-sm font-bold tabular-nums">
                    {r.pts}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
