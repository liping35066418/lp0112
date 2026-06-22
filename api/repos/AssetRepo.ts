import db from '../db.js';
import type { Asset, AssetDetail, AssetMetadata, AssetType, AssetStatus, AssetVersion, User } from '../../shared/types.js';
import { UserRepo } from './UserRepo.js';

export interface AssetRow {
  id: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  tags_json: string;
  thumbnail: string;
  current_version_id: string;
  uploader_id: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface VersionRow {
  id: string;
  asset_id: string;
  version: number;
  remark: string;
  file_path: string;
  metadata_json: string;
  created_by_id: string;
  created_at: string;
}

export interface LockRow {
  asset_id: string;
  locked_by_id: string;
  locked_at: string;
  expires_at: number;
}

export interface ArchiveRow {
  id: string;
  asset_id: string;
  operator_id: string;
  archived_at: string;
  remark: string;
}

function parseJSON<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function mapAsset(row: AssetRow, withUsers = true): Asset {
  const metadata = parseJSON<AssetMetadata>(row.metadata_json, { fileSize: 0, format: '', isOversized: false });
  const tags = parseJSON<string[]>(row.tags_json, []);
  const uploader = withUsers ? UserRepo.getUserById(row.uploader_id) ?? undefined : undefined;
  const lock = LockRepo.get(row.id);
  let isLocked = false;
  let lockedBy: string | undefined;
  let lockedByUser: User | undefined;
  let lockedAt: string | undefined;
  if (lock && lock.expires_at > Date.now()) {
    isLocked = true;
    lockedBy = lock.locked_by_id;
    lockedAt = lock.locked_at;
    lockedByUser = UserRepo.getUserById(lock.locked_by_id) ?? undefined;
  }
  const versionCount = VersionRepo.countByAsset(row.id);
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    tags,
    thumbnail: row.thumbnail,
    currentVersionId: row.current_version_id,
    uploaderId: row.uploader_id,
    uploader,
    metadata,
    isLocked,
    lockedBy,
    lockedByUser,
    lockedAt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
    versionCount,
  };
}

function mapVersion(row: VersionRow, withUsers = true): AssetVersion {
  const metadata = parseJSON<AssetMetadata>(row.metadata_json, { fileSize: 0, format: '', isOversized: false });
  const createdBy = withUsers ? UserRepo.getUserById(row.created_by_id) ?? undefined : undefined;
  return {
    id: row.id,
    assetId: row.asset_id,
    version: row.version,
    remark: row.remark,
    filePath: row.file_path,
    metadata,
    createdById: row.created_by_id,
    createdBy,
    createdAt: row.created_at,
  };
}

export const AssetRepo = {
  create(data: {
    id: string; name: string; type: AssetType; tags: string[]; thumbnail: string;
    currentVersionId: string; uploaderId: string; metadata: AssetMetadata; status?: AssetStatus;
  }): boolean {
    const res = db.prepare(
      `INSERT INTO assets (id, name, type, status, tags_json, thumbnail, current_version_id, uploader_id, metadata_json)
       VALUES (?, ?, ?, COALESCE(?, 'active'), ?, ?, ?, ?, ?)`
    ).run(
      data.id, data.name, data.type, data.status || null,
      JSON.stringify(data.tags), data.thumbnail,
      data.currentVersionId, data.uploaderId, JSON.stringify(data.metadata)
    );
    return res.changes > 0;
  },

  updateCurrentVersion(id: string, versionId: string, metadata?: AssetMetadata, name?: string): boolean {
    const res = db.prepare(
      `UPDATE assets SET current_version_id = ?, updated_at = datetime('now'),
       metadata_json = COALESCE(?, metadata_json), name = COALESCE(?, name) WHERE id = ?`
    ).run(versionId, metadata ? JSON.stringify(metadata) : null, name || null, id);
    return res.changes > 0;
  },

  findById(id: string): (AssetRow | null) {
    return db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as AssetRow | null;
  },

  getById(id: string): (Asset | null) {
    const row = this.findById(id);
    return row ? mapAsset(row) : null;
  },

  getDetailById(id: string): (AssetDetail | null) {
    const row = this.findById(id);
    if (!row) return null;
    const asset = mapAsset(row) as AssetDetail;
    asset.versions = VersionRepo.listByAsset(id);
    return asset;
  },

  list(filters: { type?: AssetType; status?: AssetStatus; search?: string; uploaderId?: string; archived?: boolean } = {}): Asset[] {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters.archived === true) {
      clauses.push('status = ?');
      params.push('archived');
    } else if (filters.archived === false) {
      clauses.push('status != ?');
      params.push('archived');
    } else if (filters.status) {
      clauses.push('status = ?');
      params.push(filters.status);
    }
    if (filters.type) {
      clauses.push('type = ?');
      params.push(filters.type);
    }
    if (filters.uploaderId) {
      clauses.push('uploader_id = ?');
      params.push(filters.uploaderId);
    }
    if (filters.search) {
      clauses.push('(name LIKE ? OR tags_json LIKE ?)');
      const s = `%${filters.search}%`;
      params.push(s, s);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `SELECT * FROM assets ${where} ORDER BY updated_at DESC`;
    const rows = db.prepare(sql).all(...params) as AssetRow[];
    return rows.map(r => mapAsset(r));
  },

  updateStatus(id: string, status: AssetStatus, archivedAt?: string): boolean {
    const res = db.prepare(
      `UPDATE assets SET status = ?, archived_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(status, archivedAt || null, id);
    return res.changes > 0;
  },

  listOversized(): { id: string; name: string; totalSize: number }[] {
    return db.prepare(
      `SELECT a.id, a.name,
              COALESCE(SUM(json_extract(v.metadata_json, '$.fileSize')), 0) AS totalSize
       FROM assets a
       LEFT JOIN asset_versions v ON v.asset_id = a.id
       WHERE a.status != 'archived' AND json_extract(a.metadata_json, '$.isOversized') = 1
       GROUP BY a.id, a.name`
    ).all() as { id: string; name: string; totalSize: number }[];
  },

  sumFileSizes(): number {
    const row = db.prepare(
      `SELECT COALESCE(SUM(json_extract(v.metadata_json, '$.fileSize')), 0) AS total
       FROM asset_versions v
       INNER JOIN assets a ON a.id = v.asset_id
       WHERE a.status != 'archived'`
    ).get() as { total: number };
    return row.total || 0;
  },
};

export const VersionRepo = {
  create(data: {
    id: string; assetId: string; version: number; remark: string;
    filePath: string; metadata: AssetMetadata; createdById: string;
  }): boolean {
    const res = db.prepare(
      `INSERT INTO asset_versions (id, asset_id, version, remark, file_path, metadata_json, created_by_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(data.id, data.assetId, data.version, data.remark, data.filePath, JSON.stringify(data.metadata), data.createdById);
    return res.changes > 0;
  },

  findById(id: string): (VersionRow | null) {
    return db.prepare('SELECT * FROM asset_versions WHERE id = ?').get(id) as VersionRow | null;
  },

  getById(id: string): (AssetVersion | null) {
    const row = this.findById(id);
    return row ? mapVersion(row) : null;
  },

  listByAsset(assetId: string): AssetVersion[] {
    const rows = db.prepare(
      'SELECT * FROM asset_versions WHERE asset_id = ? ORDER BY version DESC'
    ).all(assetId) as VersionRow[];
    return rows.map(r => mapVersion(r));
  },

  nextVersion(assetId: string): number {
    const row = db.prepare(
      'SELECT COALESCE(MAX(version), 0) AS v FROM asset_versions WHERE asset_id = ?'
    ).get(assetId) as { v: number };
    return (row.v || 0) + 1;
  },

  countByAsset(assetId: string): number {
    const row = db.prepare(
      'SELECT COUNT(*) AS c FROM asset_versions WHERE asset_id = ?'
    ).get(assetId) as { c: number };
    return row.c || 0;
  },
};

export const LockRepo = {
  get(assetId: string): (LockRow | null) {
    return db.prepare('SELECT * FROM asset_locks WHERE asset_id = ?').get(assetId) as LockRow | null;
  },

  acquire(assetId: string, userId: string, ttlMs = 5 * 60 * 1000): boolean {
    const expiresAt = Date.now() + ttlMs;
    const existing = this.get(assetId);
    if (existing && existing.expires_at > Date.now() && existing.locked_by_id !== userId) {
      return false;
    }
    db.prepare(
      `INSERT INTO asset_locks (asset_id, locked_by_id, locked_at, expires_at)
       VALUES (?, ?, datetime('now'), ?)
       ON CONFLICT(asset_id) DO UPDATE SET
         locked_by_id = excluded.locked_by_id,
         locked_at = excluded.locked_at,
         expires_at = excluded.expires_at`
    ).run(assetId, userId, expiresAt);
    return true;
  },

  release(assetId: string, userId?: string): boolean {
    if (userId) {
      const res = db.prepare('DELETE FROM asset_locks WHERE asset_id = ? AND locked_by_id = ?').run(assetId, userId);
      return res.changes > 0;
    }
    const res = db.prepare('DELETE FROM asset_locks WHERE asset_id = ?').run(assetId);
    return res.changes > 0;
  },

  cleanupExpired(): void {
    db.prepare('DELETE FROM asset_locks WHERE expires_at < ?').run(Date.now());
  },
};

export const ArchiveRepo = {
  create(data: { id: string; assetId: string; operatorId: string; remark?: string }): boolean {
    const res = db.prepare(
      `INSERT INTO archive_records (id, asset_id, operator_id, remark) VALUES (?, ?, ?, ?)`
    ).run(data.id, data.assetId, data.operatorId, data.remark || '');
    return res.changes > 0;
  },

  list(): ArchiveRow[] {
    return db.prepare('SELECT * FROM archive_records ORDER BY archived_at DESC').all() as ArchiveRow[];
  },

  findByAssetId(assetId: string): (ArchiveRow | null) {
    return db.prepare('SELECT * FROM archive_records WHERE asset_id = ? ORDER BY archived_at DESC LIMIT 1').get(assetId) as ArchiveRow | null;
  },

  removeByAssetId(assetId: string): boolean {
    const res = db.prepare('DELETE FROM archive_records WHERE asset_id = ?').run(assetId);
    return res.changes > 0;
  },
};
