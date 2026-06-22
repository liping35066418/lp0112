export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  role: UserRole;
  status: 'active' | 'disabled';
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export type AssetType = 'model' | 'texture' | 'other';
export type AssetStatus = 'active' | 'archived' | 'warning';

export interface AssetMetadata {
  faces?: number;
  vertices?: number;
  width?: number;
  height?: number;
  fileSize: number;
  format: string;
  isOversized: boolean;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  tags: string[];
  thumbnail: string;
  currentVersionId: string;
  uploaderId: string;
  uploader?: User;
  metadata: AssetMetadata;
  isLocked: boolean;
  lockedBy?: string;
  lockedByUser?: User;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  versionCount: number;
}

export interface AssetVersion {
  id: string;
  assetId: string;
  version: number;
  remark: string;
  filePath: string;
  metadata: AssetMetadata;
  createdById: string;
  createdBy?: User;
  createdAt: string;
}

export interface AssetDetail extends Asset {
  versions: AssetVersion[];
}

export interface UploadResult {
  success: boolean;
  assetId?: string;
  versionId?: string;
  metadata?: AssetMetadata;
  message?: string;
}

export interface StorageStatus {
  totalBytes: number;
  usedBytes: number;
  oversizedAssets: { id: string; name: string; size: number }[];
  warningThreshold: number;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PermissionError {
  code: 'PERMISSION_DENIED' | 'ASSET_LOCKED' | 'NOT_FOUND';
  message: string;
  lockedBy?: User;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
}

export interface UpdateRoleRequest {
  role: UserRole;
}

export interface BatchArchiveRequest {
  assetIds: string[];
  remark?: string;
}

export interface ArchiveRecord {
  id: string;
  assetId: string;
  asset?: Asset;
  operatorId: string;
  operator?: User;
  archivedAt: string;
  remark: string;
}

export const MODEL_FORMATS = ['.glb', '.gltf', '.obj', '.fbx', '.usdz', '.stl'];
export const TEXTURE_FORMATS = ['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.tga', '.bmp', '.exr', '.hdr'];

export const OVERSIZED_THRESHOLDS = {
  MODEL_FILE: 100 * 1024 * 1024,
  TEXTURE_FILE: 50 * 1024 * 1024,
  MODEL_FACES: 5_000_000,
  TEXTURE_PIXELS: 8192 * 8192,
};

export const TOTAL_STORAGE_BYTES = 100 * 1024 * 1024 * 1024;
export const STORAGE_WARNING_PERCENT = 80;
