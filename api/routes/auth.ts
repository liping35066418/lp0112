import { Router, Request, Response } from 'express';
import { AuthService, UserService } from '../services/AuthService.js';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.js';
import type { LoginRequest, UpdateRoleRequest, CreateUserRequest } from '../../shared/types.js';

const router = Router();

router.post('/auth/login', (req: Request<unknown, unknown, LoginRequest>, res: Response) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ code: 'BAD_REQUEST', message: '请输入账号和密码' });
    return;
  }
  const result = AuthService.login(username.trim(), password);
  if (!result) {
    res.status(401).json({ code: 'INVALID_CREDENTIALS', message: '账号或密码错误' });
    return;
  }
  res.json(result);
});

router.get('/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

router.get('/users', authMiddleware, requireRole('admin'), (_req, res: Response) => {
  res.json({ items: UserService.listAll() });
});

router.patch('/users/:id/role', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role } = (req.body as UpdateRoleRequest) || {};
  if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
    res.status(400).json({ code: 'BAD_REQUEST', message: '无效角色' });
    return;
  }
  const ok = UserService.updateRole(id, role);
  res.json({ success: ok });
});

router.patch('/users/:id/status', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = (req.body as { status: 'active' | 'disabled' }) || {};
  if (!status || !['active', 'disabled'].includes(status)) {
    res.status(400).json({ code: 'BAD_REQUEST', message: '无效状态' });
    return;
  }
  const ok = UserService.setStatus(id, status);
  res.json({ success: ok });
});

router.post('/users', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => {
  const body = req.body as CreateUserRequest;
  if (!body.username || !body.password || !body.displayName || !body.role) {
    res.status(400).json({ code: 'BAD_REQUEST', message: '参数不完整' });
    return;
  }
  const r = UserService.create(body);
  if (!r.ok) {
    res.status(400).json({ code: 'DUPLICATE', message: r.message });
    return;
  }
  res.json({ success: true, id: r.id });
});

export default router;
