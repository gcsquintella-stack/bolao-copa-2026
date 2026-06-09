import type { MatchStage } from "@/components/jogos/types";

// Espelho EXATO do motor de pontuação (supabase/migrations/0006_scoring.sql).
// Usado pra mostrar no card os pontos que um palpite está marcando — tanto no
// jogo encerrado (confere com o valor gravado em predictions.points) quanto no
// jogo ao vivo (provisório, com o placar parcial). Manter em sincronia com o SQL.

export type ScoringConfig = {
  points_exact: number;
  points_winner_goaldiff: number;
  points_winner_only: number;
  points_wrong: number;
  mult_r32: number;
  mult_r16: number;
  mult_qf: number;
  mult_sf: number;
  mult_final: number;
};

export const DEFAULT_SCORING: ScoringConfig = {
  points_exact: 10,
  points_winner_goaldiff: 6,
  points_winner_only: 3,
  points_wrong: 0,
  mult_r32: 1.5,
  mult_r16: 2,
  mult_qf: 2.5,
  mult_sf: 3,
  mult_final: 4,
};

// scoring_config pode vir com numéricos como string (Postgres numeric) — coage.
export function parseScoringConfig(
  raw: Record<string, unknown> | null | undefined,
): ScoringConfig {
  if (!raw) return DEFAULT_SCORING;
  const num = (v: unknown, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  return {
    points_exact: num(raw.points_exact, DEFAULT_SCORING.points_exact),
    points_winner_goaldiff: num(
      raw.points_winner_goaldiff,
      DEFAULT_SCORING.points_winner_goaldiff,
    ),
    points_winner_only: num(
      raw.points_winner_only,
      DEFAULT_SCORING.points_winner_only,
    ),
    points_wrong: num(raw.points_wrong, DEFAULT_SCORING.points_wrong),
    mult_r32: num(raw.mult_r32, DEFAULT_SCORING.mult_r32),
    mult_r16: num(raw.mult_r16, DEFAULT_SCORING.mult_r16),
    mult_qf: num(raw.mult_qf, DEFAULT_SCORING.mult_qf),
    mult_sf: num(raw.mult_sf, DEFAULT_SCORING.mult_sf),
    mult_final: num(raw.mult_final, DEFAULT_SCORING.mult_final),
  };
}

// Multiplicador da fase (grupo ×1; 3º lugar usa o das semis, igual ao SQL).
export function stageMultiplier(stage: MatchStage, cfg: ScoringConfig): number {
  switch (stage) {
    case "group":
      return 1;
    case "r32":
      return cfg.mult_r32;
    case "r16":
      return cfg.mult_r16;
    case "qf":
      return cfg.mult_qf;
    case "sf":
      return cfg.mult_sf;
    case "third":
      return cfg.mult_sf;
    case "final":
      return cfg.mult_final;
  }
}

export type ScoreTier = "exact" | "winner_goaldiff" | "winner_only" | "wrong";

const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);

export function scorePrediction(
  pred: { home: number; away: number },
  result: { home: number; away: number },
  stage: MatchStage,
  cfg: ScoringConfig,
): { points: number; tier: ScoreTier } {
  let base: number;
  let tier: ScoreTier;

  if (pred.home === result.home && pred.away === result.away) {
    base = cfg.points_exact;
    tier = "exact";
  } else if (sign(pred.home - pred.away) === sign(result.home - result.away)) {
    if (
      result.home !== result.away &&
      pred.home - pred.away === result.home - result.away
    ) {
      base = cfg.points_winner_goaldiff;
      tier = "winner_goaldiff";
    } else {
      base = cfg.points_winner_only;
      tier = "winner_only";
    }
  } else {
    base = cfg.points_wrong;
    tier = "wrong";
  }

  // integer no banco -> arredonda (multiplicadores ×1,5/×2,5 podem dar .5)
  return { points: Math.round(stageMultiplier(stage, cfg) * base), tier };
}
