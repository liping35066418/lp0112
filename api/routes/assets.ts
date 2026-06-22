import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.js';
import { AssetUploadService, AssetQueryService, VersionService, LockService, ArchiveService, TagService } from '../services/AssetService.js';
import type { AssetType, BatchArchiveRequest, UpdateTagsRequest } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.resolve(__dirname, '..', '..', 'uploads', '_tmp');

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, TMP_DIR),
    filename: (_req, file, cb) => cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${file.originalname}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
});

import fs from 'fs';
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const router = Router();

router.get('/assets', authMiddleware, (req: AuthRequest, res: Response) => {
  const { type, status, search, uploaderId, archived, tags } = req.query as {
    type?: AssetType; status?: string; search?: string; uploaderId?: string; archived?: string; tags?: string;
  };
  const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined;
  const items = AssetQueryService.list({
    type,
    search,
    uploaderId,
    archived: archived === 'true' ? true : archived === 'false' ? false : undefined,
    tags: tagList,
  });
  res.json({ items, total: items.length, page: 1, pageSize: items.length || 20 });
});

router.get('/tags', authMiddleware, (req: AuthRequest, res: Response) => {
  const { archived } = req.query as { archived?: string };
  const items = TagService.listAllTags(
    archived === 'true' ? true : archived === 'false' ? false : undefined
  );
  res.json({ items });
});

router.patch('/assets/:id/tags', authMiddleware, requireRole('admin', 'editor'), (req: AuthRequest, res: Response) => {
  const { tags } = (req.body || {}) as UpdateTagsRequest;
  if (!Array.isArray(tags)) {
    res.status(400).json({ code: 'PERMISSION_DENIED', message: 'tags 参数必须为数组' });
    return;
  }
  const r = TagService.updateTags(req.params.id, tags, req.userId!);
  if (!r.ok) {
    if (r.lockedBy) {
      res.status(409).json({ code: 'ASSET_LOCKED', message: r.message, lockedBy: r.lockedBy });
    } else {
      res.status(400).json({ code: 'NOT_FOUND', message: r.message });
    }
    return;
  }
  const fresh = AssetQueryService.detail(req.params.id);
  res.json({ success: true, asset: fresh });
});

router.get('/assets/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const data = AssetQueryService.detail(req.params.id);
  if (!data) {
    res.status(404).json({ code: 'NOT_FOUND', message: '素材不存在' });
    return;
  }
  res.json(data);
});

router.post('/assets/upload', authMiddleware, requireRole('admin', 'editor'), upload.single('file'), async (req: AuthRequest, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  const remark = (req.body?.remark as string) || '';
  const assetId = (req.body?.assetId as string) || undefined;
  if (!file) {
    res.status(400).json({ success: false, message: '未检测到文件' });
    return;
  }
  const result = await AssetUploadService.upload(
    { originalname: file.originalname, path: file.path, size: file.size },
    req.userId!,
    remark,
    assetId,
  );
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

router.post('/assets/:id/rollback/:versionId', authMiddleware, requireRole('admin', 'editor'), (req: AuthRequest, res: Response) => {
  const { id, versionId } = req.params;
  const lockR = LockService.verifyUnlockedOrOwned(id, req.userId!);
  if (!lockR.ok) {
    res.status(409).json({ code: 'ASSET_LOCKED', message: `素材正在被${lockR.lockedBy?.displayName || '他人'}编辑中`, lockedBy: lockR.lockedBy });
    return;
  }
  const r = VersionService.rollback(id, versionId, req.userId!);
  if (!r.ok) {
    res.status(400).json({ success: false, message: r.message });
    return;
  }
  res.json({ success: true, newVersionId: r.newVersionId });
});

router.post('/assets/:id/lock', authMiddleware, requireRole('admin', 'editor'), (req: AuthRequest, res: Response) => {
  const r = LockService.acquire(req.params.id, req.userId!);
  if (!r.ok) {
    res.status(409).json({ code: 'ASSET_LOCKED', message: `素材正在被${r.lockedBy?.displayName || '他人'}编辑中`, lockedBy: r.lockedBy });
    return;
  }
  res.json({ success: true });
});

router.post('/assets/:id/unlock', authMiddleware, (req: AuthRequest, res: Response) => {
  const ok = LockService.release(req.params.id, req.user!.role === 'admin' ? undefined : req.userId);
  res.json({ success: ok });
});

router.post('/assets/archive', authMiddleware, requireRole('admin', 'editor'), (req: AuthRequest, res: Response) => {
  const { assetIds, remark } = (req.body || {}) as BatchArchiveRequest;
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    res.status(400).json({ success: false, message: '请选择要归档的素材' });
    return;
  }
  const r = ArchiveService.batchArchive(assetIds, req.userId!, remark);
  res.json({ success: true, ...r });
});

router.post('/assets/archive/:id/restore', authMiddleware, requireRole('admin', 'editor'), (req: AuthRequest, res: Response) => {
  const ok = ArchiveService.restore(req.params.id);
  res.json({ success: ok });
});

router.get('/archive/records', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ items: ArchiveService.listRecords() });
});

export default router;
