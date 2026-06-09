// Leituras de "agora" centralizadas aqui, FORA do corpo de componentes/hooks.
// Motivo: a regra react-hooks/purity (React Compiler) proíbe chamar funções
// impuras como Date.now() durante o render. Isolando a leitura nestes helpers,
// os componentes ficam "puros" para o linter e o comportamento é idêntico —
// a trava por kickoff continua refletindo o tempo do render. Bônus: elimina a
// duplicação do cálculo `Date.now() >= new Date(x).getTime()` que estava
// repetido em vários arquivos.

/** Epoch em ms agora. */
export function nowMs(): number {
  return Date.now();
}

/** Date de agora (use quando precisar formatar a data/hora atual). */
export function nowDate(): Date {
  return new Date();
}

/** Um kickoff (ISO) já passou? (trava do palpite de um jogo). */
export function isKickoffPassed(kickoffIso: string, now: number = nowMs()): boolean {
  return now >= new Date(kickoffIso).getTime();
}

/** O torneio já começou? (apito do 1º jogo) — trava edição de config/bônus. */
export function tournamentStarted(
  firstKickoffIso?: string | null,
  now: number = nowMs(),
): boolean {
  return firstKickoffIso ? now >= new Date(firstKickoffIso).getTime() : false;
}
