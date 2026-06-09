import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";

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
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(__dirname, file),
  });
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

export interface LogRecord {
  id: number;
  created_at: string;
  prompt: string;
  text_result: string;
  image_results: string;
  tokens_prompt: number;
  tokens_completion: number;
  tokens_total: number;
}

export function queryLogs(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}): { list: LogRecord[]; total: number; page: number; pageSize: number } {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  let whereSql = "";
  const whereArgs: unknown[] = [];
  if (params.search) {
    whereSql = "WHERE prompt LIKE ?";
    whereArgs.push(`%${params.search}%`);
  }

  const countStmt = db.database.prepare(`SELECT COUNT(*) as count FROM logs ${whereSql}`);
  countStmt.bind(whereArgs);
  let total = 0;
  if (countStmt.step()) {
    total = countStmt.getAsObject().count as number;
  }
  countStmt.free();

  const queryStmt = db.database.prepare(
    `SELECT * FROM logs ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  );
  queryStmt.bind([...whereArgs, pageSize, offset]);
  const list: LogRecord[] = [];
  while (queryStmt.step()) {
    list.push(queryStmt.getAsObject() as unknown as LogRecord);
  }
  queryStmt.free();

  return { list, total, page, pageSize };
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
