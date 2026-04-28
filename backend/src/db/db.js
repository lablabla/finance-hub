import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _db;

function getDb() {
  if (!_db) {
    const dbPath = process.env.DB_PATH || './data/finance.sqlite';
    mkdirSync(dirname(dbPath), { recursive: true });
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    _db.exec(schema);
  }
  return _db;
}

export function query(sql, params = []) {
  return getDb().prepare(sql).all(params);
}

export function run(sql, params = []) {
  return getDb().prepare(sql).run(params);
}

export function get(sql, params = []) {
  return getDb().prepare(sql).get(params);
}

export default getDb;
