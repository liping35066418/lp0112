import type { AssetMetadata } from '../../../shared/types.js';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatDate(iso?: string): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = 60 * 1000, hour = 60 * min, day = 24 * hour;
  if (diff < min) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  return formatDate(iso);
}

export function summarizeMeta(m: AssetMetadata): string[] {
  const parts: string[] = [];
  if (m.faces != null) parts.push(`面数 ${formatNumber(m.faces)}`);
  if (m.vertices != null) parts.push(`顶点 ${formatNumber(m.vertices)}`);
  if (m.width != null && m.height != null) parts.push(`${m.width}×${m.height}`);
  if (m.format) parts.push(m.format.toUpperCase());
  return parts;
}

export function typeLabel(t: 'model' | 'texture' | 'other'): string {
  return t === 'model' ? '3D模型' : t === 'texture' ? '贴图' : '其他';
}

export function typeColor(t: 'model' | 'texture' | 'other'): string {
  return t === 'model'
    ? 'border-brand-400/40 text-brand-300 bg-brand-400/10'
    : t === 'texture'
      ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10'
      : 'border-slate-500/40 text-slate-300 bg-slate-500/10';
}

export function roleLabel(r: 'admin' | 'editor' | 'viewer'): string {
  return r === 'admin' ? '管理员' : r === 'editor' ? '编辑者' : '只读用户';
}

export function roleColor(r: 'admin' | 'editor' | 'viewer'): string {
  return r === 'admin'
    ? 'border-rose-400/50 text-rose-300 bg-rose-500/10'
    : r === 'editor'
      ? 'border-amber-400/50 text-amber-300 bg-amber-500/10'
      : 'border-sky-400/50 text-sky-300 bg-sky-500/10';
}

export function randomGradient(seed: string): string {
  const palettes = [
    ['#38BDF8', '#6366F1'],
    ['#10B981', '#0EA5E9'],
    ['#F59E0B', '#EF4444'],
    ['#A78BFA', '#EC4899'],
    ['#14B8A6', '#3B82F6'],
    ['#F43F5E', '#8B5CF6'],
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const p = palettes[h % palettes.length];
  return `linear-gradient(135deg, ${p[0]}, ${p[1]})`;
}

export function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}
