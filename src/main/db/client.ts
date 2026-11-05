import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { seedDatabase } from './seed';

let dbInstance: Database.Database | null = null;
let currentDbPath: string = '';

export function getDatabasePath(): string {
  if (currentDbPath) return currentDbPath;

  const isDev = process.env.NODE_ENV === 'development' || !app || !app.isPackaged;
  let baseDir: string;

  if (app && app.getPath) {
    baseDir = path.join(app.getPath('userData'), 'database');
  } else {
    baseDir = path.join(process.cwd(), 'data');
  }

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  currentDbPath = path.join(baseDir, 'blocktheory.db');
  return currentDbPath;
}

export function initDatabase(customPath?: string): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = customPath || getDatabasePath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? undefined : undefined,
  });

  // Enable WAL mode for high concurrency & robustness
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');

  // Load and execute schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  } else {
    // If bundled or path differs in production
    const fallbackPath = path.join(__dirname, '../../src/main/db/schema.sql');
    if (fs.existsSync(fallbackPath)) {
      const schemaSql = fs.readFileSync(fallbackPath, 'utf8');
      db.exec(schemaSql);
    }
  }

  // Seed demo data if database is fresh
  seedDatabase(db, false);

  dbInstance = db;
  return dbInstance;
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.pragma('wal_checkpoint(TRUNCATE)');
      dbInstance.close();
    } catch (e) {
      console.error('Error closing database:', e);
    }
    dbInstance = null;
  }
}

