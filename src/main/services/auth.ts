import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/client';
import { User, UserRole, ROLE_PERMISSIONS } from '../../shared/types';

export interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export function checkPermission(userRole: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[userRole] || [];
  return perms.includes(permission);
}

export function loginWithPassword(username: string, passwordPlain: string): LoginResult {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT id, username, name, password_hash, pin_hash, role, phone, is_active, created_at, last_login
    FROM users
    WHERE LOWER(username) = LOWER(?) AND is_active = 1
  `).get(username) as any;

  if (!row) {
    return { success: false, error: 'Invalid username or user is deactivated.' };
  }

  const isValid = bcrypt.compareSync(passwordPlain, row.password_hash);
  if (!isValid) {
    return { success: false, error: 'Incorrect password.' };
  }

  // Update last login
  const now = new Date().toISOString();
  db.prepare("UPDATE users SET last_login = datetime('now', 'localtime') WHERE id = ?").run(row.id);

  // Log audit
  db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity, details)
    VALUES (?, 'LOGIN_PASSWORD', 'AUTH', 'User logged in via password.')
  `).run(row.id);

  const user: User = {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role as UserRole,
    phone: row.phone,
    is_active: row.is_active,
    has_pin: row.pin_hash ? 1 : 0,
    created_at: row.created_at,
    last_login: now,
  };

  return {
    success: true,
    user,
    token: `sess_${row.id}_${Date.now()}`,
  };
}

export function loginWithPin(pinPlain: string): LoginResult {
  const db = getDatabase();
  const users = db.prepare(`
    SELECT id, username, name, pin_hash, role, phone, is_active, created_at, last_login
    FROM users
    WHERE pin_hash IS NOT NULL AND is_active = 1
  `).all() as any[];

  for (const row of users) {
    if (bcrypt.compareSync(pinPlain, row.pin_hash)) {
      const now = new Date().toISOString();
      db.prepare("UPDATE users SET last_login = datetime('now', 'localtime') WHERE id = ?").run(row.id);

      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity, details)
        VALUES (?, 'LOGIN_PIN', 'AUTH', 'User logged in via quick PIN.')
      `).run(row.id);

      const user: User = {
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role as UserRole,
        phone: row.phone,
        is_active: row.is_active,
        has_pin: 1,
        created_at: row.created_at,
        last_login: now,
      };

      return {
        success: true,
        user,
        token: `sess_${row.id}_${Date.now()}`,
      };
    }
  }

  return { success: false, error: 'Invalid PIN code.' };
}

export function getAllStaff(): User[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, username, name, role, phone, is_active, CASE WHEN pin_hash IS NOT NULL THEN 1 ELSE 0 END as has_pin, created_at, last_login
    FROM users
    ORDER BY id ASC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    username: r.username,
    name: r.name,
    role: r.role as UserRole,
    phone: r.phone,
    is_active: r.is_active,
    has_pin: r.has_pin,
    created_at: r.created_at,
    last_login: r.last_login,
  }));
}
