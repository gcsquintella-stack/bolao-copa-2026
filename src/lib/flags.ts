// De-para do código FIFA de 3 letras (teams.code) -> nome de arquivo da bandeira
// circular em /public/flags (padrão circle-flags, ISO 3166-1 alpha-2 + subdivisões
// gb-eng/gb-sct). Cobre as 48 seleções da Copa 2026.
export const FIFA_TO_ISO: Record<string, string> = {
  MEX: "mx",
  RSA: "za",
  KOR: "kr",
  CZE: "cz",
  CAN: "ca",
  BIH: "ba",
  QAT: "qa",
  SUI: "ch",
  BRA: "br",
  MAR: "ma",
  HAI: "ht",
  SCO: "gb-sct",
  USA: "us",
  PAR: "py",
  AUS: "au",
  TUR: "tr",
  GER: "de",
  CUW: "cw",
  CIV: "ci",
  ECU: "ec",
  NED: "nl",
  JPN: "jp",
  SWE: "se",
  TUN: "tn",
  BEL: "be",
  EGY: "eg",
  IRN: "ir",
  NZL: "nz",
  ESP: "es",
  CPV: "cv",
  KSA: "sa",
  URU: "uy",
  FRA: "fr",
  SEN: "sn",
  IRQ: "iq",
  NOR: "no",
  ARG: "ar",
  ALG: "dz",
  AUT: "at",
  JOR: "jo",
  POR: "pt",
  COD: "cd",
  UZB: "uz",
  COL: "co",
  ENG: "gb-eng",
  CRO: "hr",
  GHA: "gh",
  PAN: "pa",
};

// Caminho do SVG circular para um código FIFA. Retorna null se desconhecido
// (ex.: placeholder de mata-mata "vencedor do Grupo A" ainda sem time).
export function flagSrc(code?: string | null): string | null {
  if (!code) return null;
  const iso = FIFA_TO_ISO[code.toUpperCase()];
  return iso ? `/flags/${iso}.svg` : null;
}
