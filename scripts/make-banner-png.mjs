// Gera docs/banner-bolao.png — banner vertical (WhatsApp) explicando o bolão:
// objetivo, como funciona, pontuação e funcionalidades. Identidade clara/azul
// (Fase 9). Renderiza SVG -> PNG em 3x via sharp (fontes do sistema).
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const W = 1080;
const M = 64; // margem
const CW = W - M * 2; // largura útil
const C = {
  bg: "#F6F8FC",
  ink: "#0F1B2D",
  blue: "#2456E6",
  blueDeep: "#1B3FAE",
  card: "#FFFFFF",
  border: "#E4E9F2",
  muted: "#5B6B82",
  green: "#15A34A",
  gold: "#B57A12",
  white: "#FFFFFF",
};
const SANS = "'Segoe UI','Helvetica Neue',Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const p = [];
const T = (x, y, s, o = {}) => {
  const {
    size = 28,
    weight = 400,
    fill = C.ink,
    family = SANS,
    anchor = "start",
    spacing = 0,
    italic = false,
  } = o;
  p.push(
    `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${spacing ? ` letter-spacing="${spacing}"` : ""}${italic ? ` font-style="italic"` : ""}>${esc(s)}</text>`,
  );
};
const card = (x, y, w, h, fill = C.card, stroke = C.border) =>
  p.push(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
  );
const eyebrow = (y, s) =>
  T(M, y, s.toUpperCase(), { size: 23, weight: 700, fill: C.blue, spacing: 3 });

// ---------------------------------------------------------------- HERO
const HERO = 392;
p.push(
  `<rect x="0" y="0" width="${W}" height="${HERO}" fill="url(#hero)"/>`,
);
// emblema
p.push(
  `<rect x="${M}" y="74" width="74" height="74" rx="20" fill="#ffffff" fill-opacity="0.16" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2"/>`,
);
T(M + 37, 124, "S", {
  size: 44,
  weight: 800,
  fill: C.white,
  family: SERIF,
  anchor: "middle",
});
T(M + 96, 100, "S.M.M.A", { size: 26, weight: 700, fill: C.white, spacing: 5 });
T(M + 96, 134, "Bolão pago entre amigos", {
  size: 23,
  weight: 400,
  fill: "#DCE6FF",
});
T(M, 232, "Bolão da Copa 2026", {
  size: 78,
  weight: 700,
  fill: C.white,
  family: SERIF,
});
T(M, 300, "Palpite nos jogos e nos bônus do torneio,", {
  size: 30,
  fill: "#E6EDFF",
});
T(M, 342, "acompanhe ao vivo e dispute o topo do ranking.", {
  size: 30,
  fill: "#E6EDFF",
});

let y = HERO + 60;

// ---------------------------------------------------------------- OBJETIVO
eyebrow(y, "O objetivo");
y += 40;
card(M, y, CW, 132);
T(M + 32, y + 52, "São 104 jogos. Você crava o placar de cada um e ainda", {
  size: 27,
  fill: C.ink,
});
T(M + 32, y + 90, "aposta nos bônus do campeonato. Cada acerto vale ponto —", {
  size: 27,
  fill: C.ink,
});
// terceira linha
p.push(
  `<text x="${M + 32}" y="${y + 128}" font-family="${SANS}" font-size="27" fill="${C.ink}">quem somar mais no fim, <tspan font-weight="700" fill="${C.blue}">leva o bolão</tspan>.</text>`,
);
y += 132 + 56;

// ---------------------------------------------------------------- COMO PONTUA
eyebrow(y, "Como pontua  ·  em cada jogo (90 min)");
y += 44;
const rule = (label, sub, val, color) => {
  const h = sub ? 92 : 74;
  card(M, y, CW, h);
  T(M + 30, y + (sub ? 40 : 47), label, { size: 27, weight: 600 });
  if (sub) T(M + 30, y + 72, sub, { size: 21, fill: C.muted });
  const pw = 116;
  const px = M + CW - 26 - pw;
  const py = y + (h - 54) / 2;
  p.push(
    `<rect x="${px}" y="${py}" width="${pw}" height="54" rx="14" fill="${color}1a" stroke="${color}" stroke-width="1.5"/>`,
  );
  T(px + pw / 2, py + 37, val, {
    size: 29,
    weight: 800,
    fill: color,
    anchor: "middle",
  });
  y += h + 14;
};
rule("Cravou o placar exato", "ex.: você 2×1, deu 2×1", "10", C.green);
rule("Acertou o vencedor e o saldo", "ex.: você 3×1, deu 2×0", "6", C.green);
rule("Acertou só o resultado", "quem ganhou — ou empate", "3", C.green);
rule("Errou", "", "0", C.muted);

// multiplicadores
y += 24;
eyebrow(y, "No mata-mata, os pontos multiplicam");
y += 42;
{
  const items = [
    ["16-avos", "×1,5"],
    ["Oitavas", "×2"],
    ["Quartas", "×2,5"],
    ["Semi / 3º", "×3"],
    ["Final", "×4"],
  ];
  const gap = 14;
  const w = (CW - gap * (items.length - 1)) / items.length;
  items.forEach(([t, b], i) => {
    const x = M + i * (w + gap);
    card(x, y, w, 96, "#EEF3FF", "#D6E0FB");
    T(x + w / 2, y + 40, t, { size: 21, fill: C.muted, anchor: "middle" });
    T(x + w / 2, y + 76, b, {
      size: 30,
      weight: 800,
      fill: C.blue,
      anchor: "middle",
    });
  });
  y += 96 + 14;
}

// bônus
y += 24;
eyebrow(y, "Bônus do torneio  ·  escolhe antes, trava no 1º jogo");
y += 42;
{
  const items = [
    ["Campeão", "+12"],
    ["Vice", "+6"],
    ["Artilheiro", "+6"],
    ["Revelação", "+4"],
    ["Classificado", "+1"],
  ];
  const gap = 14;
  const w = (CW - gap * (items.length - 1)) / items.length;
  items.forEach(([t, b], i) => {
    const x = M + i * (w + gap);
    card(x, y, w, 96, "#FFF8EC", "#F0E2C6");
    T(x + w / 2, y + 40, t, { size: 19, fill: C.muted, anchor: "middle" });
    T(x + w / 2, y + 76, b, {
      size: 30,
      weight: 800,
      fill: C.gold,
      anchor: "middle",
    });
  });
  y += 96 + 56;
}

// ---------------------------------------------------------------- FUNCIONALIDADES
eyebrow(y, "O que o app oferece");
y += 44;
{
  const feats = [
    ["Ranking ao vivo", "atualiza sozinho assim que sai um resultado"],
    ["Hub da Copa", "tabelas dos grupos e o chaveamento do mata-mata"],
    ["Palpites secretos", "ninguém vê o seu palpite antes do apito do jogo"],
    ["Acesso sem senha", "entra com e-mail ou Google, em segundos"],
    ["Feito para o celular", "rápido, leve e direto no navegador"],
  ];
  for (const [t, s] of feats) {
    const h = 84;
    card(M, y, CW, h);
    // bolinha azul
    p.push(
      `<circle cx="${M + 44}" cy="${y + h / 2}" r="9" fill="${C.blue}"/>`,
    );
    T(M + 78, y + 36, t, { size: 26, weight: 700 });
    T(M + 78, y + 64, s, { size: 21, fill: C.muted });
    y += h + 12;
  }
  y += 44;
}

// ---------------------------------------------------------------- CTA
const ctaH = 184;
p.push(
  `<rect x="${M}" y="${y}" width="${CW}" height="${ctaH}" rx="24" fill="url(#cta)"/>`,
);
T(W / 2, y + 56, "ENTRE AGORA", {
  size: 24,
  weight: 700,
  fill: "#CFE0FF",
  anchor: "middle",
  spacing: 4,
});
T(W / 2, y + 108, "bolao-copa-2026-theta-kohl.vercel.app", {
  size: 33,
  weight: 700,
  fill: C.white,
  anchor: "middle",
});
T(W / 2, y + 150, "É só e-mail ou Google · sem senha", {
  size: 24,
  fill: "#DCE6FF",
  anchor: "middle",
});
y += ctaH + 60;

// ---------------------------------------------------------------- monta
const H = y;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 3}" height="${H * 3}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="hero" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0%" stop-color="${C.blue}"/>
    <stop offset="100%" stop-color="${C.blueDeep}"/>
  </linearGradient>
  <linearGradient id="cta" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.blue}"/>
    <stop offset="100%" stop-color="${C.blueDeep}"/>
  </linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="${C.bg}"/>
${p.join("\n")}
</svg>`;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "docs", "banner-bolao.png");
await sharp(Buffer.from(svg)).png().toFile(out);
console.log(`PNG gerado: ${out} (${W * 3}x${H * 3}, base ${W}x${H})`);
