import { Crown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/count-up";

export type LeaderRow = {
  user_id: string;
  display_name: string;
  total_points: number;
  exact_count: number;
};

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}

const PODIUM = {
  1: { bar: "h-24", grad: "from-amber-300 to-amber-500 text-amber-950" },
  2: { bar: "h-16", grad: "from-slate-200 to-slate-400 text-slate-800" },
  3: { bar: "h-12", grad: "from-[#C88A5E] to-[#9C6238] text-amber-50" },
} as const;

function PodiumColumn({
  row,
  pos,
  me,
}: {
  row: LeaderRow;
  pos: 1 | 2 | 3;
  me: boolean;
}) {
  const p = PODIUM[pos];
  return (
    <div
      className="flex animate-fade-up flex-col items-center gap-1.5"
      style={{ animationDelay: `${(pos - 1) * 70}ms` }}
    >
      <Crown className={cn("size-5 text-amber-500", pos !== 1 && "invisible")} />
      <div
        className={cn(
          "grid place-items-center rounded-full bg-secondary font-bold text-secondary-foreground shadow-sm ring-2",
          pos === 1 ? "size-16 text-xl" : "size-12 text-base",
          me ? "ring-primary" : "ring-background",
        )}
      >
        {initials(row.display_name)}
      </div>
      <span className="max-w-[6.5rem] truncate text-sm font-semibold">
        {row.display_name.split(/\s+/)[0]}
      </span>
      <CountUp
        value={row.total_points}
        className="text-lg font-extrabold leading-none tabular-nums"
      />
      <span className="text-[10px] text-muted-foreground">
        {row.exact_count} crav.
      </span>
      <div
        className={cn(
          "mt-1 grid w-full place-items-center rounded-t-xl bg-gradient-to-b font-black shadow-sm",
          p.bar,
          p.grad,
        )}
      >
        <span className="text-2xl tabular-nums">{pos}</span>
      </div>
    </div>
  );
}

function ListRow({
  row,
  pos,
  me,
  delayMs,
}: {
  row: LeaderRow;
  pos: number;
  me: boolean;
  delayMs: number;
}) {
  return (
    <li
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn(
        "flex animate-fade-up items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm",
        me && "border-primary bg-primary/5 ring-1 ring-primary/25",
      )}
    >
      <span className="w-6 text-center text-sm font-bold tabular-nums text-muted-foreground">
        {pos}
      </span>
      <span className="grid size-9 flex-none place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
        {initials(row.display_name)}
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold">
        {row.display_name}
        {me && (
          <span className="ml-2 text-xs font-medium text-primary">você</span>
        )}
      </span>
      <span className="text-right text-[11px] text-muted-foreground">
        {row.exact_count} crav.
      </span>
      <CountUp
        value={row.total_points}
        className="w-14 text-right text-lg font-extrabold tabular-nums"
      />
    </li>
  );
}

export function Leaderboard({
  rows,
  meId,
}: {
  rows: LeaderRow[];
  meId: string | null;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <Trophy className="size-5" />
        </span>
        <p className="text-sm text-muted-foreground">
          Ninguém pontuou ainda. A disputa começa quando rolar o primeiro jogo.
        </p>
      </div>
    );
  }

  const hasPodium = rows.length >= 3;
  const listRows = hasPodium ? rows.slice(3) : rows;
  const listStart = hasPodium ? 4 : 1;

  return (
    <div className="flex flex-col gap-4">
      {hasPodium && (
        <div className="grid grid-cols-3 items-end gap-2 pt-1">
          <PodiumColumn row={rows[1]} pos={2} me={rows[1].user_id === meId} />
          <PodiumColumn row={rows[0]} pos={1} me={rows[0].user_id === meId} />
          <PodiumColumn row={rows[2]} pos={3} me={rows[2].user_id === meId} />
        </div>
      )}
      {listRows.length > 0 && (
        <ol className="flex flex-col gap-2">
          {listRows.map((r, i) => (
            <ListRow
              key={r.user_id}
              row={r}
              pos={listStart + i}
              me={r.user_id === meId}
              delayMs={i * 45}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
