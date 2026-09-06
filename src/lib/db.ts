import fs from "node:fs";
import path from "node:path";
import type { DbShape } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const GENERATED_DIR = path.join(DATA_DIR, "generated");

const EMPTY_DB: DbShape = { teachers: [], sessions: [], documents: [], requests: [] };

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY_DB, null, 2));
}

function readDb(): DbShape {
  ensureDataDir();
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(raw) as DbShape;
}

function writeDb(db: DbShape) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Simple in-process write queue so concurrent API calls don't clobber the JSON file.
let writeChain: Promise<unknown> = Promise.resolve();

export function withDb<T>(mutator: (db: DbShape) => T): Promise<T> {
  const result = writeChain.then(() => {
    const db = readDb();
    const value = mutator(db);
    writeDb(db);
    return value;
  });
  writeChain = result.catch(() => undefined);
  return result;
}

export function readDbSnapshot(): DbShape {
  return readDb();
}
