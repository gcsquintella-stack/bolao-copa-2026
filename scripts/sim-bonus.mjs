// Simulação de Monte Carlo para calibrar o peso dos palpites bônus.
// Modela N jogadores de skills diferentes, roda muitas "Copas", e mede:
//  - pontos médios (jogos vs bônus) e % do total vindo do bônus
//  - com que frequência o CAMPEÃO do bolão muda por causa do bônus
//  - embaralhamento do Top 3 e correlação skill->posição (quanto o bônus "sorteia")
// Puro: sem banco, sem rede. Rode: node scripts/sim-bonus.mjs
//
// Premissas explícitas (ajustáveis no topo). NÃO é previsão — é calibração.

const N_PLAYERS = 15;
const N_SIMS = 20000;

// Skills fixos dos jogadores (traço; entre 0=fraco e 1=craque). 15 jogadores
// espalhados de ~0.30 a ~0.80 (grupo de amigos: alguns entendem mais, outros menos).
const SKILLS = Array.from({ length: N_PLAYERS }, (_, i) => 0.30 + (0.80 - 0.30) * (i / (N_PLAYERS - 1)));

// Pontuação base por jogo e probabilidade por faixa, interpolada por skill.
const BASE = { exact: 10, gd: 6, result: 3 };
const WEAK = { exact: 0.03, gd: 0.08, result: 0.26 }; // ~63% erro
const STRONG = { exact: 0.12, gd: 0.18, result: 0.40 }; // ~30% erro
// 104 jogos com multiplicadores (grupos x1; R32 1.5; R16 2; QF 2.5; SF/3º 3; final 4)
const MULTS = [
  ...Array(72).fill(1), ...Array(16).fill(1.5), ...Array(8).fill(2),
  ...Array(4).fill(2.5), ...Array(2).fill(3), 3, 4,
];

// Configs de bônus a comparar. qualifier = pontos POR seleção classificada acertada
// (jogador aponta 2 por grupo => até 24 acertos). champion/vice/scorer/rev = evento único.
const CONFIGS = [
  { name: "Atual (teto~142)", champion: 30, vice: 15, scorer: 15, rev: 10, qualifier: 3 },
  { name: "Recalibrado (teto~94)", champion: 20, vice: 10, scorer: 10, rev: 6, qualifier: 2 },
  { name: "Enxuto (teto~52)", champion: 12, vice: 6, scorer: 6, rev: 4, qualifier: 1 },
  { name: "Mínimo (teto~34)", champion: 10, vice: 5, scorer: 5, rev: 3, qualifier: 0.5 },
];

// "Taxa de acerto" média de cada bônus entre os jogadores (reflete previsibilidade).
// champion: às vezes o favorito vence (muita gente acerta), às vezes zebra (pouca).
// Modelado como média + desvio por simulação. qualifier é por seleção (favoritos avançam).
const HIT = {
  champion: { mean: 0.25, sd: 0.18 },
  vice: { mean: 0.18, sd: 0.15 },
  scorer: { mean: 0.15, sd: 0.12 },
  rev: { mean: 0.15, sd: 0.12 },
  qualifier: { mean: 0.55, sd: 0.12 }, // por seleção apontada (24 apontadas)
};

// ---- util ----
const clamp01 = (x) => Math.max(0, Math.min(1, x));
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function drawHit(h) { return clamp01(h.mean + h.sd * gauss()); }
function binom(n, p) { let k = 0; for (let i = 0; i < n; i++) if (Math.random() < p) k++; return k; }

function matchPoints(skill) {
  const pe = WEAK.exact + (STRONG.exact - WEAK.exact) * skill;
  const pg = WEAK.gd + (STRONG.gd - WEAK.gd) * skill;
  const pr = WEAK.result + (STRONG.result - WEAK.result) * skill;
  let total = 0;
  for (const m of MULTS) {
    const r = Math.random();
    let base = r < pe ? BASE.exact : r < pe + pg ? BASE.gd : r < pe + pg + pr ? BASE.result : 0;
    total += base * m;
  }
  return total;
}

// correlação de Spearman simplificada via ranks
function rankCorr(skillArr, finalArr) {
  const idx = skillArr.map((_, i) => i);
  const rankOf = (arr) => {
    const order = [...idx].sort((a, b) => arr[b] - arr[a]);
    const r = Array(arr.length);
    order.forEach((pi, pos) => (r[pi] = pos));
    return r;
  };
  const rs = rankOf(skillArr), rf = rankOf(finalArr);
  const n = skillArr.length;
  let d2 = 0;
  for (let i = 0; i < n; i++) d2 += (rs[i] - rf[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

// ---- simulação por config ----
function simulate(cfg) {
  let sumMatch = 0, sumBonus = 0, sumTotal = 0;
  let winnerChanged = 0, top3ChurnSum = 0, corrSum = 0;
  for (let s = 0; s < N_SIMS; s++) {
    // taxas de acerto desta "Copa"
    const hc = drawHit(HIT.champion), hv = drawHit(HIT.vice), hs = drawHit(HIT.scorer),
      hr = drawHit(HIT.rev), hq = drawHit(HIT.qualifier);
    const match = [], total = [];
    for (let i = 0; i < N_PLAYERS; i++) {
      const sk = SKILLS[i];
      const mp = matchPoints(sk);
      // skill dá um empurrãozinho na chance de acertar o bônus
      const bump = (h) => clamp01(h * (0.7 + 0.6 * sk));
      let b = 0;
      if (Math.random() < bump(hc)) b += cfg.champion;
      if (Math.random() < bump(hv)) b += cfg.vice;
      if (Math.random() < bump(hs)) b += cfg.scorer;
      if (Math.random() < bump(hr)) b += cfg.rev;
      b += binom(24, bump(hq)) * cfg.qualifier;
      match.push(mp);
      total.push(mp + b);
      sumMatch += mp; sumBonus += b; sumTotal += mp + b;
    }
    // winner mudou por causa do bônus?
    const argmax = (a) => a.indexOf(Math.max(...a));
    if (argmax(match) !== argmax(total)) winnerChanged++;
    // churn do top3
    const top3 = (a) => new Set([...a.keys()].sort((x, y) => a[y] - a[x]).slice(0, 3));
    const tM = top3(match), tT = top3(total);
    let churn = 0; for (const p of tT) if (!tM.has(p)) churn++;
    top3ChurnSum += churn;
    corrSum += rankCorr(SKILLS, total);
  }
  const perPlayer = N_SIMS * N_PLAYERS;
  return {
    name: cfg.name,
    mediaJogos: (sumMatch / perPlayer).toFixed(0),
    mediaBonus: (sumBonus / perPlayer).toFixed(0),
    mediaTotal: (sumTotal / perPlayer).toFixed(0),
    bonusPct: ((sumBonus / sumTotal) * 100).toFixed(1) + "%",
    campeaoMudaPorBonus: ((winnerChanged / N_SIMS) * 100).toFixed(1) + "%",
    churnTop3: (top3ChurnSum / N_SIMS).toFixed(2) + " de 3",
    corrSkillRank: (corrSum / N_SIMS).toFixed(2),
  };
}

console.log(`Jogadores: ${N_PLAYERS} | Simulações: ${N_SIMS}`);
console.log("(corrSkillRank: 1.00 = ranking reflete 100% a habilidade; menor = mais sorte/bônus)\n");
console.table(CONFIGS.map(simulate));
