// Roda um arquivo .sql (ou SQL inline com --sql) no banco do Supabase usando
// SUPABASE_DB_URL do .env.local. Uso:
//   node --env-file=.env.local scripts/db.mjs caminho/arquivo.sql
//   node --env-file=.env.local scripts/db.mjs --sql "select count(*) from public.teams"
// Nunca imprime a connection string / senha.
import { readFileSync } from "node:fs";
import pg from "pg";

const args = process.argv.slice(2);
let sql;
if (args[0] === "--sql") {
  sql = args.slice(1).join(" ");
} else if (args[0]) {
  sql = readFileSync(args[0], "utf8");
} else {
  console.error("uso: node --env-file=.env.local scripts/db.mjs <arquivo.sql | --sql \"...\">");
  process.exit(1);
}

// Preferimos a senha separada (SUPABASE_DB_PASSWORD): assim qualquer caractere
// especial funciona literalmente, sem precisar escapar dentro de uma URL.
const password = process.env.SUPABASE_DB_PASSWORD;
const url = process.env.SUPABASE_DB_URL;

let clientConfig;
if (password) {
  clientConfig = {
    host: process.env.SUPABASE_DB_HOST ?? "aws-1-sa-east-1.pooler.supabase.com",
    port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
    user: process.env.SUPABASE_DB_USER ?? "postgres.lrjlhbjnggqqdbwxgnxv",
    database: "postgres",
    password,
    ssl: { rejectUnauthorized: false },
  };
} else if (url) {
  clientConfig = { connectionString: url, ssl: { rejectUnauthorized: false } };
} else {
  console.error("Defina SUPABASE_DB_PASSWORD (ou SUPABASE_DB_URL) no .env.local.");
  process.exit(1);
}

const client = new pg.Client(clientConfig);
client.on("notice", (n) => console.log("📢", n.message));

try {
  await client.connect();
  const res = await client.query(sql);
  const results = Array.isArray(res) ? res : [res];
  for (const r of results) {
    if (r?.command) console.log(`✔ ${r.command}${r.rowCount != null ? ` (${r.rowCount})` : ""}`);
    if (r?.rows?.length) console.table(r.rows.slice(0, 100));
  }
  console.log("✅ OK");
} catch (e) {
  const msg = e.message ?? String(e);
  if (msg.startsWith("OK >>>")) {
    console.log("✅ TESTE PASSOU:", msg);
  } else {
    console.error("❌ ERRO:", msg);
    if (e.code) console.error("   SQLSTATE:", e.code);
    if (e.detail) console.error("   DETALHE:", e.detail);
    process.exitCode = 1;
  }
} finally {
  await client.end();
}
