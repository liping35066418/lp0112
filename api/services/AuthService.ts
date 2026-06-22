import bcrypt from 'bcryptjs';
import UserRepo from '../repos/UserRepo.js';
import { signToken } from '../middleware/auth.js';
import type { LoginResponse } from '../../shared/types.js';
import { uuid } from './utils.js';

export const AuthService = {
  login(username: string, password: string): (LoginResponse | null) {
    const row = UserRepo.findByUsername(username);
    if (!row) return null;
    if (row.status === 'disabled') return null;
    const ok = bcrypt.compareSync(password, row.password_hash);
    if (!ok) return null;
    const user = UserRepo.getUserById(row.id)!;
    const token = signToken(user.id);
    return { token, user };
  },
};

export const UserService = {
  listAll() {
    return UserRepo.listAll();
  },

  updateRole(id: string, role: 'admin' | 'editor' | 'viewer') {
    return UserRepo.updateRole(id, role);
  },

  setStatus(id: string, status: 'active' | 'disabled') {
    return UserRepo.updateStatus(id, status);
  },

  create(data: { username: string; password: string; displayName: string; role: 'admin' | 'editor' | 'viewer' }) {
    if (UserRepo.usernameExists(data.username)) return { ok: false, message: '账号已存在' };
    const id = uuid('user');
    const passwordHash = bcrypt.hashSync(data.password, 10);
    const avatars = ['🧑‍💻', '👩‍🎨', '👨‍🎨', '🧑‍🏫', '👩‍🔬', '🎨', '🖼️', '🎭', '🎪', '🎯'];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];
    const ok = UserRepo.create({
      id, username: data.username, passwordHash, displayName: data.displayName, role: data.role, avatar,
    });
    return { ok, id };
  },
};

export default AuthService;
