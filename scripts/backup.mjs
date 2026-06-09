// Backup dos dados do bolão — foco nos PALPITES (dados que não dá pra recriar
// se sumirem). Conecta no Supabase (pooler) com SUPABASE_DB_PASSWORD e grava um
// JSON timestampado em backups/ (gitignored: contém dados de usuários e o repo
// é público). Reaproveitável: rode quando quiser uma cópia de segurança.
//
// Uso: node --env-file=.env.local scripts/backup.mjs
import pg from "pg";
import { writeFileSync, mkdirSync } from "node:fs";

// predictions + bonus_predictions = o que o jogador digitou (insubstituível).
// profiles = quem é quem. scoring_config + matches = config/resultados (dão pra
// recriar, mas vão junto pra um snapshot completo).
const TABLES = [
  "profiles",
  "predictions",
  "bonus_predictions",
  "scoring_config",
  "matches",
];

const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST ?? "aws-1-sa-east-1.pooler.supabase.com",
  port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
  user: process.env.SUPABASE_DB_USER ?? "postgres.lrjlhbjnggqqdbwxgnxv",
  database: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const dump = { taken_at: new Date().toISOString(), tables: {} };
for (const t of TABLES) {
  const { rows } = await client.query(`select * from public.${t}`);
  dump.tables[t] = rows;
  console.log(`  ${t}: ${rows.length} linhas`);
}
await client.end();

mkdirSync("backups", { recursive: true });
const stamp = dump.taken_at.replace(/[:.]/g, "-");
const file = `backups/backup-${stamp}.json`;
writeFileSync(file, JSON.stringify(dump, null, 2));
console.log(`\n✅ Backup salvo em ${file}`);
