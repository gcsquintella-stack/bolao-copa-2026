export type MatchStage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";

export type TeamRef = {
  name: string;
  code: string | null;
  flag: string | null;
} | null;

export type MatchRow = {
  id: number;
  stage: MatchStage;
  group_label: string | null;
  home: TeamRef;
  away: TeamRef;
  home_label: string | null;
  away_label: string | null;
  kickoff_at: string; // ISO UTC
  venue: string | null;
  status: "scheduled" | "live" | "finished" | "postponed" | "void";
  home_score: number | null;
  away_score: number | null;
};

export type PredictionRow = {
  match_id: number;
  home_score: number;
  away_score: number;
};

export const STAGE_LABEL: Record<MatchStage, string> = {
  group: "Fase de grupos",
  r32: "16-avos",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Semifinal",
  third: "3º lugar",
  final: "Final",
};
