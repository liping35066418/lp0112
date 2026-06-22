import db from '../db.js';
import type { User, UserRole } from '../../shared/types.js';

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  avatar: string;
  role: UserRole;
  status: 'active' | 'disabled';
  created_at: string;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  };
}

export const UserRepo = {
  findByUsername(username: string): (UserRow | null) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | null;
  },

  findById(id: string): (UserRow | null) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | null;
  },

  getUserById(id: string): (User | null) {
    const row = this.findById(id);
    return row ? mapUser(row) : null;
  },

  listAll(): User[] {
    const rows = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as UserRow[];
    return rows.map(mapUser);
  },

  updateRole(id: string, role: UserRole): boolean {
    const res = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    return res.changes > 0;
  },

  updateStatus(id: string, status: 'active' | 'disabled'): boolean {
    const res = db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
    return res.changes > 0;
  },

  create(data: { id: string; username: string; passwordHash: string; displayName: string; role: UserRole; avatar?: string }): boolean {
    const res = db.prepare(
      `INSERT INTO users (id, username, password_hash, display_name, avatar, role, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`
    ).run(data.id, data.username, data.passwordHash, data.displayName, data.avatar || '', data.role);
    return res.changes > 0;
  },

  usernameExists(username: string): boolean {
    const row = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
    return !!row;
  },
};

export default UserRepo;
