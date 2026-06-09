import { Flag } from "@/components/ui/flag";
import { cn } from "@/lib/utils";
import {
  STAGE_LABEL,
  type MatchRow,
  type MatchStage,
  type TeamRef,
} from "@/components/jogos/types";

const ORDER: MatchStage[] = ["r32", "r16", "qf", "sf", "third", "final"];

const brtShort = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "short",
});

// 'W73' -> "Vencedor 73" · '2A' -> "2º Grupo A" · '3A/B/...' -> "3º (A/B/...)"
function humanizeLabel(label: string | null): string {
  if (!label) return "A definir";
  let m: RegExpExecArray | null;
  if ((m = /^([123])([A-L])$/.exec(label))) return `${m[1]}º Grupo ${m[2]}`;
  if ((m = /^3([A-L/]+)$/.exec(label))) return `3º (${m[1]})`;
  if ((m = /^W(\d+)$/.exec(label))) return `Vencedor ${m[1]}`;
  if ((m = /^L(\d+)$/.exec(label))) return `Perdedor ${m[1]}`;
  return label;
}

function ParticipantRow({
  team,
  label,
  score,
  isWinner,
}: {
  team: TeamRef;
  label: string | null;
  score: number | null;
  isWinner: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      {team ? (
        <Flag code={team.code} name={team.name} size={20} />
      ) : (
        <span className="grid size-5 flex-none place-items-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">
          ?
        </span>
      )}
      <span
        className={cn(
          "flex-1 truncate text-sm",
          team ? "font-medium" : "italic text-muted-foreground",
          isWinner && "font-bold",
        )}
      >
        {team?.name ?? humanizeLabel(label)}
      </span>
      <span
        className={cn(
          "w-5 text-right text-sm tabular-nums",
          isWinner ? "font-bold" : "text-muted-foreground",
        )}
      >
        {score ?? ""}
      </span>
    </div>
  );
}

function BracketMatch({ match }: { match: MatchRow }) {
  const finished =
    match.status === "finished" &&
    match.home_score != null &&
    match.away_score != null;
  const isLive = match.status === "live";
  const homeWin = finished && match.home_score! > match.away_score!;
  const awayWin = finished && match.away_score! > match.home_score!;

  return (
    <div className="rounded-xl border border-border bg-card p-2.5 shadow-sm">
      <div className="mb-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{brtShort.format(new Date(match.kickoff_at))}</span>
        {isLive ? (
          <span className="font-bold text-live">AO VIVO</span>
        ) : finished ? (
          <span>Encerrado</span>
        ) : null}
      </div>
      <ParticipantRow
        team={match.home}
        label={match.home_label}
        score={match.home_score}
        isWinner={homeWin}
      />
      <ParticipantRow
        team={match.away}
        label={match.away_label}
        score={match.away_score}
        isWinner={awayWin}
      />
    </div>
  );
}

export function Bracket({ matches }: { matches: MatchRow[] }) {
  const byStage = new Map<MatchStage, MatchRow[]>();
  for (const m of matches) {
    const arr = byStage.get(m.stage);
    if (arr) arr.push(m);
    else byStage.set(m.stage, [m]);
  }

  const rounds = ORDER.filter((s) => byStage.has(s));
  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
        O mata-mata aparece quando a fase de grupos terminar.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {rounds.map((stage) => (
        <section key={stage}>
          <h2 className="mb-2 px-1 text-sm font-bold text-muted-foreground">
            {STAGE_LABEL[stage]}
          </h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {byStage.get(stage)!.map((m) => (
              <BracketMatch key={m.id} match={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
