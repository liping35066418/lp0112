import type {
  Asset, AssetDetail, AssetType, LoginRequest, LoginResponse, StorageStatus,
  User, UserRole, UploadResult, BatchArchiveRequest, ArchiveRecord, TagCount,
} from '../../shared/types.js';

const BASE = '/api';

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = token || localStorage.getItem('assetms_token');
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let data: T;
  try { data = text ? JSON.parse(text) : (undefined as unknown as T); } catch { data = text as unknown as T; }
  if (!res.ok) {
    const msg = (data as any)?.message || res.statusText || '请求失败';
    const err = new Error(msg) as Error & { code?: string; data?: unknown };
    err.code = (data as any)?.code;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  login: (body: LoginRequest) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  me: () => request<{ user: User }>('/auth/me', { headers: headers() }),

  listAssets: (q: { type?: AssetType; search?: string; archived?: boolean; tags?: string[] } = {}) => {
    const sp = new URLSearchParams();
    if (q.type) sp.set('type', q.type);
    if (q.search) sp.set('search', q.search);
    if (q.archived !== undefined) sp.set('archived', String(q.archived));
    if (q.tags && q.tags.length > 0) sp.set('tags', q.tags.join(','));
    return request<{ items: Asset[]; total: number }>(`/assets?${sp}`, { headers: headers() });
  },

  listTags: (q: { archived?: boolean } = {}) => {
    const sp = new URLSearchParams();
    if (q.archived !== undefined) sp.set('archived', String(q.archived));
    return request<{ items: TagCount[] }>(`/tags?${sp}`, { headers: headers() });
  },

  updateAssetTags: (assetId: string, tags: string[]) =>
    request<{ success: boolean; asset: AssetDetail }>(`/assets/${assetId}/tags`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ tags }),
    }),

  assetDetail: (id: string) =>
    request<AssetDetail>(`/assets/${id}`, { headers: headers() }),

  uploadAsset: (file: File, remark = '', assetId?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (remark) fd.append('remark', remark);
    if (assetId) fd.append('assetId', assetId);
    const token = localStorage.getItem('assetms_token');
    return fetch(`${BASE}/assets/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(async r => {
      const t = await r.text();
      let d: any; try { d = JSON.parse(t); } catch { d = t; }
      if (!r.ok) { const e = new Error(d?.message || '上传失败'); (e as any).code = d?.code; (e as any).data = d; throw e; }
      return d as UploadResult;
    });
  },

  rollback: (assetId: string, versionId: string) =>
    request<{ success: boolean; newVersionId?: string }>(`/assets/${assetId}/rollback/${versionId}`, {
      method: 'POST', headers: headers(),
    }),

  lockAsset: (assetId: string) =>
    request<{ success: boolean }>(`/assets/${assetId}/lock`, { method: 'POST', headers: headers() }),

  unlockAsset: (assetId: string) =>
    request<{ success: boolean }>(`/assets/${assetId}/unlock`, { method: 'POST', headers: headers() }),

  archive: (assetIds: string[], remark = '') =>
    request<{ success: boolean; archived: number; records: ArchiveRecord[] }>('/assets/archive', {
      method: 'POST', headers: headers(), body: JSON.stringify({ assetIds, remark } satisfies BatchArchiveRequest),
    }),

  restore: (assetId: string) =>
    request<{ success: boolean }>(`/assets/archive/${assetId}/restore`, {
      method: 'POST', headers: headers(),
    }),

  archiveRecords: () =>
    request<{ items: (ArchiveRecord & { asset?: Asset; operator?: User })[] }>(
      '/archive/records', { headers: headers() },
    ),

  listUsers: () => request<{ items: User[] }>('/users', { headers: headers() }),

  updateRole: (userId: string, role: UserRole) =>
    request<{ success: boolean }>(`/users/${userId}/role`, {
      method: 'PATCH', headers: headers(), body: JSON.stringify({ role }),
    }),

  createUser: (data: { username: string; password: string; displayName: string; role: UserRole }) =>
    request<{ success: boolean; id: string }>('/users', {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }),

  setUserStatus: (userId: string, status: 'active' | 'disabled') =>
    request<{ success: boolean }>(`/users/${userId}/status`, {
      method: 'PATCH', headers: headers(), body: JSON.stringify({ status }),
    }),

  storageStatus: () => request<StorageStatus>('/storage/status', { headers: headers() }),
};

export function handleErr(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export default api;
