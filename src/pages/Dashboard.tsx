import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Image as ImageIcon, FileQuestion, AlertTriangle, Lock, Eye,
  Plus, Layers, Users, HardDrive, Clock, Archive as ArchiveIcon,
} from 'lucide-react';
import api, { handleErr } from '@/api/client.js';
import type { Asset, AssetType, StorageStatus } from '../../../shared/types.js';
import { useAuth, useFilters, useToast } from '@/store/auth.js';
import {
  formatBytes, formatNumber, typeColor, typeLabel, roleLabel, roleColor,
  randomGradient, relativeTime, summarizeMeta,
} from '@/lib/utils.js';

function AssetCard({ a, onToggle, selected }: { a: Asset; onToggle: (id: string) => void; selected: boolean }) {
  const nav = useNavigate();
  const canEdit = useAuth(s => s.canEdit());
  const Icon = a.type === 'model' ? Box : a.type === 'texture' ? ImageIcon : FileQuestion;
  const meta = summarizeMeta(a.metadata);
  return (
    <div
      className={`card group relative cursor-pointer ${selected ? 'ring-2 ring-brand-400 shadow-glow-sm' : ''}`}
      onClick={() => nav(`/asset/${a.id}`)}
    >
      {canEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(a.id); }}
          className={`absolute top-2 left-2 w-5 h-5 rounded border-2 z-10 grid place-items-center transition-all
            ${selected ? 'border-brand-400 bg-brand-500' : 'border-space-600 bg-space-900/80 hover:border-brand-400/60'}`}
        >
          {selected && <span className="w-2.5 h-2.5 rounded-sm bg-white" />}
        </button>
      )}
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
        {a.status === 'warning' && (
          <span className="chip bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse-slow" title="超大资源预警">
            <AlertTriangle className="w-3 h-3" /> 预警
          </span>
        )}
        {a.status === 'archived' && (
          <span className="chip bg-slate-500/20 border-slate-500/40 text-slate-300">
            <ArchiveIcon className="w-3 h-3" /> 已归档
          </span>
        )}
        {a.isLocked && (
          <span className="chip bg-rose-500/20 border-rose-500/40 text-rose-300" title={`被 ${a.lockedByUser?.displayName} 锁定`}>
            <Lock className="w-3 h-3" /> 编辑中
          </span>
        )}
        {!canEdit && (
          <span className="chip bg-sky-500/20 border-sky-500/40 text-sky-300" title="只读权限">
            <Eye className="w-3 h-3" />
          </span>
        )}
      </div>

      <div className="h-40 relative overflow-hidden" style={{ background: randomGradient(a.id) }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="w-16 h-16 text-white/90 drop-shadow-lg" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-space-900/80 via-transparent" />
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
          <div className="flex gap-1 flex-wrap">
            <span className={`chip ${typeColor(a.type)}`}>{typeLabel(a.type)}</span>
            {meta.slice(0, 1).map((m, i) => (
              <span key={i} className="chip border-space-600/60 bg-space-900/60 text-slate-300">{m}</span>
            ))}
          </div>
          <span className="chip border-space-600/60 bg-space-900/60 text-slate-300 font-mono">v{a.versionCount}</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="min-w-0">
          <div className="text-sm text-white font-medium truncate group-hover:text-brand-300 transition-colors">{a.name}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-space-700 to-space-800 grid place-items-center text-[10px] shrink-0">
              {a.uploader?.avatar || '👤'}
            </span>
            <span className="truncate">{a.uploader?.displayName || '-'}</span>
            <span>·</span>
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" /> {relativeTime(a.updatedAt)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-space-700/50">
          {meta.length > 0 ? meta.slice(0, 3).map((m, i) => (
            <div key={i} className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                {i === 0 && a.type === 'model' ? '面数' : i === 1 && a.type === 'model' ? '顶点' : i === 0 && a.type === 'texture' ? '分辨率' : '规格'}
              </div>
              <div className="text-xs text-slate-300 font-mono">{m.split(' ').slice(-1)[0]}</div>
            </div>
          )) : (
            <>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">大小</div>
                <div className="text-xs text-slate-300 font-mono">{formatBytes(a.metadata.fileSize)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">格式</div>
                <div className="text-xs text-slate-300 font-mono uppercase">{a.metadata.format}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">版本</div>
                <div className="text-xs text-slate-300 font-mono">v{a.versionCount}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [list, setList] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const { assetType, search, archived, setAssetType, setArchived } = useFilters();
  const push = useToast(s => s.push);
  const nav = useNavigate();
  const canEdit = useAuth(s => s.canEdit());
  const isAdmin = useAuth(s => s.isAdmin());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState(false);

  const filtered = useMemo(() => {
    let r = list;
    if (assetType !== 'all') r = r.filter(x => x.type === assetType);
    const s = search.trim().toLowerCase();
    if (s) r = r.filter(x =>
      x.name.toLowerCase().includes(s) ||
      x.tags.some(t => t.toLowerCase().includes(s)) ||
      (x.uploader?.displayName || '').toLowerCase().includes(s)
    );
    return r;
  }, [list, assetType, search]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [r1, r2] = await Promise.all([
          api.listAssets({ archived: archived === true ? true : archived === false ? false : undefined }),
          api.storageStatus().catch(() => null),
        ]);
        setList(r1.items);
        setStatus(r2);
      } catch (err) { push('error', handleErr(err)); }
      finally { setLoading(false); }
    })();
  }, [archived, push]);

  const toggleSel = (id: string) =>
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const selectAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(f => f.id)));

  async function batchArchive() {
    if (selected.size === 0) return;
    if (!confirm(`确定归档选中的 ${selected.size} 个素材？`)) return;
    setArchiving(true);
    try {
      const r = await api.archive([...selected], '批量归档');
      push('success', `已归档 ${r.archived} 个素材`);
      setSelected(new Set());
      setList(list.filter(a => !selected.has(a.id)));
    } catch (err) { push('error', handleErr(err)); }
    finally { setArchiving(false); }
  }

  const stats = useMemo(() => {
    const model = list.filter(x => x.type === 'model').length;
    const tex = list.filter(x => x.type === 'texture').length;
    const warn = list.filter(x => x.status === 'warning').length;
    const editors = new Set(list.map(x => x.uploaderId)).size;
    return { model, tex, warn, editors };
  }, [list]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '3D模型总数', value: stats.model, icon: Box, color: 'from-brand-400 to-indigo-500' },
          { label: '贴图总数', value: stats.tex, icon: ImageIcon, color: 'from-emerald-400 to-teal-500' },
          { label: '超大资源预警', value: stats.warn, icon: AlertTriangle, color: 'from-amber-400 to-rose-500', pulse: stats.warn > 0 },
          { label: '活跃贡献者', value: stats.editors, icon: Users, color: 'from-violet-400 to-pink-500' },
        ].map((s, i) => (
          <div key={i} className="glass p-4 flex items-center gap-4 hover:border-brand-400/30 transition-all">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} grid place-items-center shadow-lg shrink-0 ${s.pulse ? 'animate-pulse-slow' : ''}`}>
              <s.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-0.5">{s.label}</div>
              <div className="font-display text-2xl text-white">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {status?.oversizedAssets && status.oversizedAssets.length > 0 && (
        <div className="glass border-amber-500/30 p-4 flex items-start gap-4 bg-amber-500/5">
          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5 animate-pulse-slow" />
          <div className="flex-1">
            <div className="text-sm text-amber-300 font-semibold mb-1">存储预警</div>
            <div className="text-xs text-slate-400">
              共 <span className="text-amber-400 font-semibold">{status.oversizedAssets.length}</span> 个超大资源，
              占用存储 <span className="text-amber-400 font-semibold">{formatBytes(status.oversizedAssets.reduce((s, x) => s + x.size, 0))}</span>。
              建议清理或归档。
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {status.oversizedAssets.slice(0, 6).map(o => (
                <button key={o.id} onClick={() => nav(`/asset/${o.id}`)}
                  className="chip bg-space-900/70 border-amber-500/30 text-amber-200 hover:border-amber-400 hover:text-amber-100 transition-all cursor-pointer">
                  <HardDrive className="w-3 h-3" /> {o.name} <span className="opacity-70">({formatBytes(o.size)})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'model', 'texture', 'other'] as const).map(t => (
            <button key={t} onClick={() => setAssetType(t)}
              className={`chip transition-all cursor-pointer
                ${assetType === t
                  ? 'bg-brand-400/15 border-brand-400 text-brand-300 shadow-glow-sm'
                  : 'border-space-700 text-slate-400 hover:border-space-600 hover:text-slate-300'}`}
            >
              {t === 'all' ? '全部' : t === 'model' ? '3D模型' : t === 'texture' ? '贴图' : '其他'}
            </button>
          ))}
          <div className="w-px h-5 bg-space-700 mx-1" />
          <button onClick={() => setArchived(archived ? undefined : false)}
            className={`chip cursor-pointer transition-all
              ${archived === undefined
                ? 'bg-brand-400/15 border-brand-400 text-brand-300'
                : 'border-space-700 text-slate-400 hover:border-space-600 hover:text-slate-300'}`}
          >全部状态</button>
          <button onClick={() => setArchived(false)}
            className={`chip cursor-pointer transition-all
              ${archived === false
                ? 'bg-emerald-400/15 border-emerald-400 text-emerald-300'
                : 'border-space-700 text-slate-400 hover:border-space-600 hover:text-slate-300'}`}
          >进行中</button>
          <button onClick={() => setArchived(true)}
            className={`chip cursor-pointer transition-all
              ${archived === true
                ? 'bg-slate-400/15 border-slate-400 text-slate-300'
                : 'border-space-700 text-slate-400 hover:border-space-600 hover:text-slate-300'}`}
          >已归档</button>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={() => nav('/upload')} className="btn-primary">
              <Plus className="w-4 h-4" /> 上传素材
            </button>
          )}
          {isAdmin && (
            <button onClick={() => nav('/archive')} className="btn-outline">
              <ArchiveIcon className="w-4 h-4" /> 归档中心
            </button>
          )}
        </div>
      </div>

      {canEdit && selected.size > 0 && (
        <div className="glass p-3 flex items-center justify-between gap-4 animate-slide-up sticky top-20 z-20">
          <div className="flex items-center gap-3 text-sm">
            <button onClick={selectAll} className="btn-ghost !px-2 !py-1">
              {selected.size === filtered.length ? '取消全选' : '全选'}
            </button>
            <span className="text-slate-400">
              已选 <span className="text-brand-300 font-semibold">{selected.size}</span> / {filtered.length} 个素材
            </span>
          </div>
          <button onClick={batchArchive} disabled={archiving} className="btn-warn">
            <ArchiveIcon className="w-4 h-4" />
            {archiving ? '归档中...' : `批量归档 (${selected.size})`}
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-40 bg-space-800" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-space-800 rounded w-3/4" />
                <div className="h-3 bg-space-800 rounded w-1/2" />
                <div className="h-14 bg-space-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-strong py-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-400/20 to-indigo-500/20 border border-brand-400/20 grid place-items-center mb-5">
            <Layers className="w-10 h-10 text-brand-300" />
          </div>
          <h3 className="font-display text-xl text-white mb-2">暂无素材</h3>
          <p className="text-slate-500 text-sm max-w-sm mb-6">
            {search ? '没有找到匹配的素材，换个关键词试试？' : canEdit ? '点击右上角上传按钮，将你的第一个3D资产导入系统' : '等待管理员或编辑者上传素材后即可浏览'}
          </p>
          {canEdit && !search && (
            <button onClick={() => nav('/upload')} className="btn-primary">
              <Plus className="w-4 h-4" /> 上传第一个素材
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(a => (
            <AssetCard key={a.id} a={a} selected={selected.has(a.id)} onToggle={toggleSel} />
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="glass-strong p-5 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-brand-400" />
            <h3 className="font-display text-white">团队成员速览</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              { name: '系统管理员', user: 'admin', avatar: '👑', role: 'admin' as const },
              { name: '设计师小王', user: 'editor', avatar: '🎨', role: 'editor' as const },
              { name: '只读用户小李', user: 'viewer', avatar: '👁️', role: 'viewer' as const },
            ].map(m => (
              <div key={m.user} className="glass p-3 flex items-center gap-3 hover:border-brand-400/30 transition-all cursor-pointer"
                onClick={() => nav('/users')}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-space-700 to-space-800 grid place-items-center text-xl">
                  {m.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{m.name}</div>
                  <span className={`chip ${roleColor(m.role)} mt-1`}>{roleLabel(m.role)}</span>
                </div>
              </div>
            ))}
            <button onClick={() => nav('/users')} className="glass p-3 flex items-center justify-center gap-2 hover:border-brand-400/40 text-slate-400 hover:text-brand-300 transition-all">
              <Plus className="w-4 h-4" /> <span className="text-sm">管理全部成员</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
