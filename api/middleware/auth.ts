import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import UserRepo from '../repos/UserRepo.js';
import type { User } from '../../shared/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'asset-management-secret-key-2026-change-me';

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ code: 'UNAUTHENTICATED', message: '未登录，请先登录' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = UserRepo.getUserById(payload.sub);
    if (!user || user.status === 'disabled') {
      res.status(401).json({ code: 'UNAUTHENTICATED', message: '账号不存在或已禁用' });
      return;
    }
    req.user = user;
    req.userId = user.id;
    next();
  } catch {
    res.status(401).json({ code: 'TOKEN_EXPIRED', message: '登录已过期，请重新登录' });
  }
}

export function requireRole(...roles: Array<'admin' | 'editor' | 'viewer'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ code: 'UNAUTHENTICATED', message: '请先登录' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ code: 'PERMISSION_DENIED', message: '无此操作权限' });
      return;
    }
    next();
  };
}
