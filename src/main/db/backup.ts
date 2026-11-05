import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import Database from 'better-sqlite3';
import { getDatabase, getDatabasePath, closeDatabase, initDatabase } from './client';

export interface BackupInfo {
  filename: string;
  filepath: string;
  sizeBytes: number;
  createdAt: string;
  isValid: boolean;
}

export function getBackupDirectory(): string {
  let baseDir: string;
  if (app && app.getPath) {
    baseDir = path.join(app.getPath('userData'), 'backups');
  } else {
    baseDir = path.join(process.cwd(), 'backups');
  }

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
}

export function verifyDatabaseFile(filePath: string): boolean {
  try {
    const testDb = new Database(filePath, { readonly: true, fileMustExist: true });
    const result = testDb.pragma('integrity_check') as { integrity_check: string }[];
    testDb.close();
    return result && result.length > 0 && result[0].integrity_check === 'ok';
  } catch (error) {
    console.error('Database integrity check failed for:', filePath, error);
    return false;
  }
}

export function createDatabaseBackup(customLabel: string = 'manual'): BackupInfo {
  const db = getDatabase();
  const backupDir = getBackupDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `blocktheory_backup_${customLabel}_${timestamp}.db`;
  const tempPath = path.join(backupDir, `${filename}.tmp`);
  const finalPath = path.join(backupDir, filename);

  // Checkpoint WAL first to flush all commits
  db.pragma('wal_checkpoint(FULL)');

  // Use SQLite online backup API to ensure 100% consistent live snapshot
  db.backup(tempPath)
    .then(() => {
      // Verify integrity before replacing
      if (verifyDatabaseFile(tempPath)) {
        fs.renameSync(tempPath, finalPath);
      } else {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        throw new Error('Integrity check failed on generated backup snapshot');
      }
    })
    .catch((err) => {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw err;
    });

  // Since db.backup returns a promise, for synchronous caller we also support safe copy fallback
  if (!fs.existsSync(finalPath)) {
    // If not completed yet or needed immediately
    const dbPath = getDatabasePath();
    fs.copyFileSync(dbPath, tempPath);
    if (verifyDatabaseFile(tempPath)) {
      fs.renameSync(tempPath, finalPath);
    }
  }

  const stats = fs.statSync(finalPath);
  return {
    filename,
    filepath: finalPath,
    sizeBytes: stats.size,
    createdAt: new Date().toISOString(),
    isValid: true,
  };
}

export function listBackups(): BackupInfo[] {
  const backupDir = getBackupDirectory();
  if (!fs.existsSync(backupDir)) return [];

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db'));
  return files.map(file => {
    const filepath = path.join(backupDir, file);
    const stats = fs.statSync(filepath);
    const isValid = verifyDatabaseFile(filepath);
    return {
      filename: file,
      filepath,
      sizeBytes: stats.size,
      createdAt: stats.mtime.toISOString(),
      isValid,
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function restoreDatabaseBackup(backupFilePath: string): { success: boolean; message: string } {
  if (!fs.existsSync(backupFilePath)) {
    return { success: false, message: 'Backup file does not exist.' };
  }

  if (!verifyDatabaseFile(backupFilePath)) {
    return { success: false, message: 'Backup file is corrupt or failed integrity verification.' };
  }

  const currentDbPath = getDatabasePath();
  const preRestoreBackup = path.join(getBackupDirectory(), `pre_restore_safety_${Date.now()}.db`);

  try {
    // Take safety copy of existing before restoring
    closeDatabase();
    if (fs.existsSync(currentDbPath)) {
      fs.copyFileSync(currentDbPath, preRestoreBackup);
    }

    // Copy backup over main db
    fs.copyFileSync(backupFilePath, currentDbPath);

    // Remove any stale WAL / SHM files
    const walFile = `${currentDbPath}-wal`;
    const shmFile = `${currentDbPath}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);

    // Reinitialize DB
    initDatabase();
    return { success: true, message: 'Database restored and verified successfully.' };
  } catch (error: any) {
    // Attempt rollback
    if (fs.existsSync(preRestoreBackup)) {
      fs.copyFileSync(preRestoreBackup, currentDbPath);
      initDatabase();
    }
    return { success: false, message: `Restore failed: ${error.message}` };
  }
}

