import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { StorageService } from '../services/AssetService.js';

const router = Router();

router.get('/storage/status', authMiddleware, (_req: AuthRequest, res: Response) => {
  res.json(StorageService.getStatus());
});

export default router;
