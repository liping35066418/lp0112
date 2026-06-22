import fs from 'fs';
import path from 'path';
import { AssetRepo, VersionRepo, LockRepo, ArchiveRepo } from '../repos/AssetRepo.js';
import UserRepo from '../repos/UserRepo.js';
import { parseMetadata, uuid, detectType, ASSETS_DIR, VERSIONS_DIR, ensureDir } from './utils.js';
import type { Asset, AssetDetail, AssetStatus, AssetType, StorageStatus, UploadResult, ArchiveRecord, User } from '../../shared/types.js';
import { STORAGE_WARNING_PERCENT, TOTAL_STORAGE_BYTES } from '../../shared/types.js';

export const AssetUploadService = {
  async upload(file: { originalname: string; path: string; size: number }, userId: string, remark = '', existingAssetId?: string): Promise<UploadResult> {
    const { originalname, path: tempPath } = file;
    const type = detectType(originalname);
    const metadata = await parseMetadata(tempPath, originalname);

    const baseName = path.basename(originalname, path.extname(originalname)).replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_');
    const assetId = existingAssetId || uuid('asset');
    const versionId = uuid('ver');

    if (existingAssetId) {
      const existing = AssetRepo.findById(existingAssetId);
      if (!existing) {
        fs.unlinkSync(tempPath);
        return { success: false, message: '素材不存在，无法更新版本' };
      }
    }

    const assetDir = path.join(ASSETS_DIR, assetId);
    const versionDir = path.join(VERSIONS_DIR, assetId);
    ensureDir(assetDir);
    ensureDir(versionDir);

    const ext = path.extname(originalname).toLowerCase();
    const version = existingAssetId ? VersionRepo.nextVersion(existingAssetId) : 1;
    const storedFileName = `v${version}_${Date.now()}${ext}`;
    const storedPath = path.join(existingAssetId ? versionDir : assetDir, storedFileName);
    fs.copyFileSync(tempPath, storedPath);
    try { fs.unlinkSync(tempPath); } catch { /* ignore */ }

    const status: AssetStatus = metadata.isOversized ? 'warning' : 'active';

    if (!existingAssetId) {
      const created = AssetRepo.create({
        id: assetId,
        name: originalname,
        type,
        tags: [],
        thumbnail: '',
        currentVersionId: versionId,
        uploaderId: userId,
        metadata,
        status,
      });
      VersionRepo.create({
        id: versionId,
        assetId,
        version: 1,
        remark: remark || '初始版本',
        filePath: storedPath,
        metadata,
        createdById: userId,
      });
      if (!created) {
        return { success: false, message: '创建素材失败' };
      }
    } else {
      VersionRepo.create({
        id: versionId,
        assetId: existingAssetId,
        version,
        remark: remark || `更新至 v${version}`,
        filePath: storedPath,
        metadata,
        createdById: userId,
      });
      AssetRepo.updateCurrentVersion(existingAssetId, versionId, metadata);
      if (status === 'warning') {
        AssetRepo.updateStatus(existingAssetId, status);
      }
    }

    return { success: true, assetId, versionId, metadata };
  },
};

export const VersionService = {
  rollback(assetId: string, targetVersionId: string, operatorId: string): { ok: boolean; message?: string; newVersionId?: string } {
    const asset = AssetRepo.findById(assetId);
    if (!asset) return { ok: false, message: '素材不存在' };
    const target = VersionRepo.findById(targetVersionId);
    if (!target || target.asset_id !== assetId) return { ok: false, message: '版本不存在' };

    const nextVer = VersionRepo.nextVersion(assetId);
    const src = target.file_path;
    if (!fs.existsSync(src)) return { ok: false, message: '历史版本文件已丢失' };

    const versionDir = path.join(VERSIONS_DIR, assetId);
    ensureDir(versionDir);
    const ext = path.extname(src);
    const destFileName = `v${nextVer}_rollback_from_v${target.version}_${Date.now()}${ext}`;
    const dest = path.join(versionDir, destFileName);
    fs.copyFileSync(src, dest);

    const metadata = JSON.parse(target.metadata_json);
    const newVersionId = uuid('ver');
    VersionRepo.create({
      id: newVersionId,
      assetId,
      version: nextVer,
      remark: `回退到 v${target.version} 版本`,
      filePath: dest,
      metadata,
      createdById: operatorId,
    });
    AssetRepo.updateCurrentVersion(assetId, newVersionId, metadata);
    return { ok: true, newVersionId };
  },
};

export const LockService = {
  acquire(assetId: string, userId: string, ttlMs = 5 * 60 * 1000) {
    LockRepo.cleanupExpired();
    const ok = LockRepo.acquire(assetId, userId, ttlMs);
    if (!ok) {
      const lock = LockRepo.get(assetId);
      const user = lock ? UserRepo.getUserById(lock.locked_by_id) : undefined;
      return { ok: false, lockedBy: user };
    }
    return { ok: true };
  },

  release(assetId: string, userId?: string) {
    return LockRepo.release(assetId, userId);
  },

  verifyUnlockedOrOwned(assetId: string, userId: string): { ok: boolean; lockedBy?: User } {
    LockRepo.cleanupExpired();
    const lock = LockRepo.get(assetId);
    if (!lock || lock.expires_at < Date.now()) return { ok: true };
    if (lock.locked_by_id === userId) return { ok: true };
    const user = UserRepo.getUserById(lock.locked_by_id) ?? undefined;
    return { ok: false, lockedBy: user };
  },
};

export const ArchiveService = {
  batchArchive(assetIds: string[], operatorId: string, remark = ''): { archived: number; records: ArchiveRecord[] } {
    let archived = 0;
    const records: ArchiveRecord[] = [];
    for (const id of assetIds) {
      const asset = AssetRepo.findById(id);
      if (!asset || asset.status === 'archived') continue;
      AssetRepo.updateStatus(id, 'archived', new Date().toISOString());
      const recId = uuid('ar');
      ArchiveRepo.create({ id: recId, assetId: id, operatorId, remark });
      archived++;
      records.push({
        id: recId,
        assetId: id,
        operatorId,
        archivedAt: new Date().toISOString(),
        remark,
      });
    }
    return { archived, records };
  },

  restore(assetId: string): boolean {
    const asset = AssetRepo.findById(assetId);
    if (!asset || asset.status !== 'archived') return false;
    AssetRepo.updateStatus(assetId, asset.metadata_json ? (JSON.parse(asset.metadata_json).isOversized ? 'warning' : 'active') : 'active', undefined);
    ArchiveRepo.removeByAssetId(assetId);
    return true;
  },

  listRecords(): (ArchiveRecord & { asset?: Asset; operator?: User })[] {
    const rows = ArchiveRepo.list();
    return rows.map(r => ({
      id: r.id,
      assetId: r.asset_id,
      operatorId: r.operator_id,
      archivedAt: r.archived_at,
      remark: r.remark || '',
      asset: AssetRepo.getById(r.asset_id) ?? undefined,
      operator: UserRepo.getUserById(r.operator_id) ?? undefined,
    }));
  },
};

export const StorageService = {
  getStatus(): StorageStatus {
    const used = AssetRepo.sumFileSizes();
    const overAssets = AssetRepo.listOversized().map(r => ({
      id: r.id,
      name: r.name,
      size: r.totalSize,
    }));
    return {
      totalBytes: TOTAL_STORAGE_BYTES,
      usedBytes: used,
      oversizedAssets: overAssets,
      warningThreshold: STORAGE_WARNING_PERCENT,
    };
  },
};

export const AssetQueryService = {
  list(filters: { type?: AssetType; status?: AssetStatus; search?: string; uploaderId?: string; archived?: boolean; tags?: string[] } = {}): Asset[] {
    return AssetRepo.list(filters);
  },

  detail(id: string): (AssetDetail | null) {
    return AssetRepo.getDetailById(id);
  },
};

export const TagService = {
  updateTags(assetId: string, tags: string[], userId: string): { ok: boolean; message?: string; lockedBy?: User } {
    const asset = AssetRepo.findById(assetId);
    if (!asset) return { ok: false, message: '素材不存在' };
    const lockR = LockService.verifyUnlockedOrOwned(assetId, userId);
    if (!lockR.ok) {
      return { ok: false, message: `素材正在被${lockR.lockedBy?.displayName || '他人'}编辑中`, lockedBy: lockR.lockedBy };
    }
    const cleaned = [...new Set(tags.map(t => t.trim()).filter(Boolean))];
    const ok = AssetRepo.updateTags(assetId, cleaned);
    return ok ? { ok: true } : { ok: false, message: '更新标签失败' };
  },

  listAllTags(archived?: boolean): { tag: string; count: number }[] {
    return AssetRepo.listAllTagsWithCount(archived);
  },
};
