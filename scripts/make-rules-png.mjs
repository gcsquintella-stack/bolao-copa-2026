// Gera docs/regras-pontuacao.png — pôster das regras pra compartilhar.
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const W = 1080, H = 1560;
const C = {
  bg: "#0a0e0c", card: "#151d18", green: "#34d399", gold: "#fbbf24",
  white: "#f4f6f5", muted: "#98a39d", soft: "#222c26",
};
const F = "'Segoe UI','Helvetica Neue',Arial,sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const p = [];

p.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);
// brilho verde no topo
p.push(`<rect width="${W}" height="${H}" fill="url(#glow)"/>`);

// header
p.push(`<circle cx="78" cy="92" r="10" fill="${C.green}"/>`);
p.push(`<text x="100" y="100" font-family="${F}" font-size="26" letter-spacing="4" fill="${C.muted}">S.M.M.A</text>`);
p.push(`<text x="64" y="172" font-family="${F}" font-size="60" font-weight="800" fill="${C.white}">Bolão da Copa 2026</text>`);
p.push(`<text x="64" y="220" font-family="${F}" font-size="30" font-weight="700" fill="${C.green}">Como pontua</text>`);

// ---- helpers ----
function sectionTitle(x, y, t) {
  p.push(`<text x="${x}" y="${y}" font-family="${F}" font-size="24" font-weight="700" letter-spacing="2" fill="${C.muted}">${esc(t.toUpperCase())}</text>`);
}
function ruleRow(y, label, sub, val, color) {
  const h = sub ? 96 : 78;
  p.push(`<rect x="64" y="${y}" width="${W - 128}" height="${h}" rx="18" fill="${C.card}"/>`);
  p.push(`<text x="92" y="${y + (sub ? 42 : 48)}" font-family="${F}" font-size="30" font-weight="600" fill="${C.white}">${esc(label)}</text>`);
  if (sub) p.push(`<text x="92" y="${y + 74}" font-family="${F}" font-size="22" fill="${C.muted}">${esc(sub)}</text>`);
  // pílula de pontos
  const pw = 120, px = W - 64 - 28 - pw, py = y + (h - 56) / 2;
  p.push(`<rect x="${px}" y="${py}" width="${pw}" height="56" rx="14" fill="${color}1f" stroke="${color}" stroke-width="1.5"/>`);
  p.push(`<text x="${px + pw / 2}" y="${py + 38}" text-anchor="middle" font-family="${F}" font-size="30" font-weight="800" fill="${color}">${esc(val)}</text>`);
  return y + h + 16;
}
function chip(x, y, w, top, big) {
  p.push(`<rect x="${x}" y="${y}" width="${w}" height="96" rx="16" fill="${C.card}"/>`);
  p.push(`<text x="${x + w / 2}" y="${y + 40}" text-anchor="middle" font-family="${F}" font-size="22" fill="${C.muted}">${esc(top)}</text>`);
  p.push(`<text x="${x + w / 2}" y="${y + 76}" text-anchor="middle" font-family="${F}" font-size="34" font-weight="800" fill="${C.green}">${esc(big)}</text>`);
}

let y = 290;
sectionTitle(64, y, "Em cada jogo  ·  vale o placar dos 90 min");
y += 28;
y = ruleRow(y, "Cravou o placar exato", "você 2×1, deu 2×1", "10", C.green);
y = ruleRow(y, "Acertou o vencedor + o saldo de gols", "você 3×1, deu 2×0", "6", C.green);
y = ruleRow(y, "Acertou só o resultado", "quem ganhou, ou empate", "3", C.green);
y = ruleRow(y, "Errou", "", "0", C.muted);

y += 26;
sectionTitle(64, y, "No mata-mata, os pontos do jogo multiplicam");
y += 28;
{
  const gap = 16, cols = 5, w = (W - 128 - gap * (cols - 1)) / cols;
  const items = [["16-avos", "×1,5"], ["Oitavas", "×2"], ["Quartas", "×2,5"], ["Semi / 3º", "×3"], ["Final", "×4"]];
  items.forEach(([t, b], i) => chip(64 + i * (w + gap), y, w, t, b));
  y += 96 + 16;
}

y += 26;
sectionTitle(64, y, "Bônus do torneio  ·  escolhe antes; trava no 1º jogo");
y += 28;
y = ruleRow(y, "Cravar o campeão", "", "+12", C.gold);
y = ruleRow(y, "Cravar o vice", "", "+6", C.gold);
y = ruleRow(y, "Cravar o artilheiro", "", "+6", C.gold);
y = ruleRow(y, "Cravar a revelação", "azarão que vai mais longe", "+4", C.gold);
y = ruleRow(y, "Cada seleção certa que passa do grupo", "até 24 no total", "+1", C.gold);

// rodapé
y += 14;
p.push(`<rect x="64" y="${y}" width="${W - 128}" height="1.5" fill="${C.soft}"/>`);
y += 44;
p.push(`<text x="64" y="${y}" font-family="${F}" font-size="22" fill="${C.muted}">Prorrogação e pênaltis não contam  ·  o palpite trava no apito  ·  ranking ao vivo</text>`);

const SCALE = 3; // renderiza em 3x p/ ficar nítido (viewBox mantém o layout)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="0 0 ${W} ${H}">
<defs><radialGradient id="glow" cx="50%" cy="0%" r="70%">
<stop offset="0%" stop-color="${C.green}" stop-opacity="0.16"/>
<stop offset="60%" stop-color="${C.green}" stop-opacity="0"/></radialGradient></defs>
${p.join("\n")}
</svg>`;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "docs", "regras-pontuacao.png");
await sharp(Buffer.from(svg)).png().toFile(out);
console.log("PNG gerado em", out);
