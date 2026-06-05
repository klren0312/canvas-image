import fs from "node:fs";
import path from "node:path";

const DB_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "logs.db");

fs.mkdirSync(DB_DIR, { recursive: true });

let db: Awaited<ReturnType<typeof loadDb>>;

interface LogInput {
  prompt: string;
  textResult: string;
  imageResults: string;
  tokensPrompt?: number;
  tokensCompletion?: number;
  tokensTotal?: number;
}

async function loadDb() {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs();
  let database: Awaited<ReturnType<typeof SQL.Database>>;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    database = new SQL.Database(buffer);
  } else {
    database = new SQL.Database();
  }
  database.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      prompt TEXT NOT NULL,
      text_result TEXT NOT NULL,
      image_results TEXT NOT NULL,
      tokens_prompt INTEGER DEFAULT 0,
      tokens_completion INTEGER DEFAULT 0,
      tokens_total INTEGER DEFAULT 0
    )
  `);
  return { database, SQL };
}

function save() {
  const data = db.database.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export async function initDb() {
  db = await loadDb();
}

export function insertLog(input: LogInput): void {
  const stmt = db.database.prepare(`
    INSERT INTO logs (prompt, text_result, image_results, tokens_prompt, tokens_completion, tokens_total)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run([
    input.prompt,
    input.textResult,
    input.imageResults,
    input.tokensPrompt ?? 0,
    input.tokensCompletion ?? 0,
    input.tokensTotal ?? 0,
  ]);
  stmt.free();
  save();
}
