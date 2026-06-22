import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive as ArchiveIcon, RotateCcw, Search, Calendar, User as UserIcon,
  AlertTriangle, File, Filter, FolderOpen, Inbox, Undo2, Clock, Trash2,
} from 'lucide-react';
import api, { handleErr } from '@/api/client.js';
import type { Asset, ArchiveRecord } from '../../../shared/types.js';
import { useAuth, useToast } from '@/store/auth.js';
import { formatBytes, formatDate, randomGradient, roleLabel, roleColor, typeColor, typeLabel } from '@/lib/utils.js';

type Tab = 'archived' | 'records';

export default function ArchivePage() {
  const nav = useNavigate();
  const push = useToast(s => s.push);
  const isAdmin = useAuth(s => s.isAdmin());
  const [tab, setTab] = useState<Tab>('archived');
  const [archivedAssets, setArchivedAssets] = useState<Asset[]>([]);
  const [records, setRecords] = useState<(ArchiveRecord & { asset?: Asset; operator?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState<string | null>(null);
  const [batchRestoring, setBatchRestoring] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([
        api.listAssets({ archived: true }),
        tab === 'records' ? api.archiveRecords().catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
      ]);
      setArchivedAssets(a.items);
      setRecords(r.items);
    } catch (e) { push('error', handleErr(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [tab, push]);

  const filtered = archivedAssets.filter(a => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return a.name.toLowerCase().includes(s) || a.tags.some(t => t.toLowerCase().includes(s));
  });

  async function restoreOne(id: string) {
    if (!confirm('确定恢复此素材？将重新出现在素材库中。')) return;
    setRestoring(id);
    try {
      await api.restore(id);
      push('success', '素材已恢复');
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      load();
    } catch (e) { push('error', handleErr(e)); }
    finally { setRestoring(null); }
  }

  async function batchRestore() {
    if (selected.size === 0) return;
    if (!confirm(`确定批量恢复 ${selected.size} 个素材？`)) return;
    setBatchRestoring(true);
    let ok = 0;
    for (const id of selected) {
      try { await api.restore(id); ok++; }
      catch (e) { push('error', `${id} 恢复失败：${handleErr(e)}`); }
    }
    push('success', `已恢复 ${ok} 个素材`);
    setSelected(new Set());
    setBatchRestoring(false);
    load();
  }

  const toggle = (id: string) => setSelected(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const allSelected = filtered.length > 0 && filtered.every(a => selected.has(a.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(a => a.id)));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-white mb-1">归档中心</h1>
          <p className="text-sm text-slate-500">集中管理过期废弃素材，支持批量归档与一键恢复。</p>
        </div>
        {isAdmin && (
          <button onClick={() => nav('/users')} className="btn-outline">
            <UserIcon className="w-4 h-4" /> 权限管理
          </button>
        )}
      </div>

      <div className="glass overflow-hidden">
        <div className="flex items-center border-b border-space-700/60">
          {([
            { k: 'archived', label: '已归档素材', icon: FolderOpen, count: archivedAssets.length },
            { k: 'records', label: '归档操作记录', icon: Calendar, count: records.length },
          ] as { k: Tab; label: string; icon: any; count: number }[]).map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`flex-1 md:flex-none px-6 py-4 flex items-center gap-3 text-sm relative transition-colors
                ${tab === t.k ? 'text-brand-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <t.icon className="w-4 h-4" />
              <span className="font-medium">{t.label}</span>
              <span className={`chip ${tab === t.k ? 'bg-brand-400/15 border-brand-400/40 text-brand-300' : 'border-space-700 bg-space-900/60 text-slate-400'}`}>
                {t.count}
              </span>
              {tab === t.k && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-brand-400 to-indigo-500 rounded-full" />}
            </button>
          ))}
        </div>

        {tab === 'archived' ? (
          <>
            <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-space-700/60">
              <div className="relative max-w-md flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  className="input pl-9 h-10" placeholder="搜索已归档素材..." />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={toggleAll} className="btn-ghost">
                  {allSelected ? '取消全选' : '全选当前'}
                </button>
                <button onClick={batchRestore} disabled={selected.size === 0 || batchRestoring} className="btn-outline">
                  <Undo2 className="w-4 h-4" />
                  {batchRestoring ? '恢复中…' : `批量恢复 (${selected.size})`}
                </button>
              </div>
            </div>

            {selected.size > 0 && (
              <div className="px-4 py-3 bg-brand-400/5 border-b border-brand-400/20 flex items-center justify-between">
                <div className="text-sm text-brand-300">
                  已选择 <span className="font-semibold">{selected.size}</span> 个素材待恢复
                </div>
                <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-300">
                  清空选择
                </button>
              </div>
            )}

            <div className="p-4">
              {loading ? (
                <div className="grid md:grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="glass h-24 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-500/20 grid place-items-center">
                    <Inbox className="w-10 h-10 text-slate-500" />
                  </div>
                  <h3 className="font-display text-white mb-2">暂无归档素材</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    归档区用于存放暂时不用但仍需留存的素材。在素材库选中素材后点击批量归档即可移入此处。
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(a => (
                    <div key={a.id}
                      className={`glass p-4 flex items-center gap-4 transition-all hover:border-brand-400/30 cursor-pointer group
                        ${selected.has(a.id) ? 'ring-2 ring-brand-400 shadow-glow-sm' : ''}`}
                      onClick={() => nav(`/asset/${a.id}`)}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); toggle(a.id); }}
                        className={`w-5 h-5 rounded border-2 shrink-0 grid place-items-center transition-all
                          ${selected.has(a.id) ? 'border-brand-400 bg-brand-500' : 'border-space-600 bg-space-900/80 hover:border-brand-400/60'}`}
                      >
                        {selected.has(a.id) && <span className="w-2.5 h-2.5 rounded-sm bg-white" />}
                      </button>
                      <div className="w-20 h-16 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                        style={{ background: randomGradient(a.id) }}>
                        <File className="w-8 h-8 text-white/90" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <div className="text-sm text-white truncate font-medium group-hover:text-brand-300 transition-colors">{a.name}</div>
                          <span className={`chip ${typeColor(a.type)}`}>{typeLabel(a.type)}</span>
                          {a.metadata.isOversized && (
                            <span className="chip bg-amber-500/20 border-amber-500/40 text-amber-300">
                              <AlertTriangle className="w-3 h-3" /> 超大
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3" /> {a.uploader?.displayName || '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> 归档于 {formatDate(a.archivedAt)}
                          </span>
                          <span className="font-mono">{formatBytes(a.metadata.fileSize)}</span>
                          <span className="chip border-space-700 bg-space-900/60">v{a.versionCount} 个版本</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); restoreOne(a.id); }}
                          disabled={restoring === a.id}
                          className="btn-outline !px-3 !py-1.5"
                        >
                          {restoring === a.id
                            ? <><span className="w-3.5 h-3.5 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" /> 恢复中</>
                            : <><RotateCcw className="w-3.5 h-3.5" /> 恢复</>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass h-20 animate-pulse" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-500/20 grid place-items-center">
                  <Calendar className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="font-display text-white mb-2">暂无归档记录</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">所有归档操作都会在这里留下可追溯的操作日志。</p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {records.map(r => (
                  <li key={r.id} className="p-4 rounded-lg hover:bg-space-800/40 transition-colors flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 grid place-items-center shrink-0">
                      <ArchiveIcon className="w-5 h-5 text-rose-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white">{r.asset?.name || '（已删除）'}</span>
                        {r.asset && <span className={`chip ${typeColor(r.asset.type)} !text-[10px] !py-0`}>{typeLabel(r.asset.type)}</span>}
                        {r.remark && <span className="text-xs text-slate-500 italic">「{r.remark}」</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-space-700 to-space-800 grid place-items-center text-[10px]">
                            {r.operator?.avatar || '👤'}
                          </div>
                          {r.operator?.displayName || '未知'}
                        </span>
                        {r.operator && (
                          <span className={`chip ${roleColor(r.operator.role)} !text-[10px] !py-0`}>{roleLabel(r.operator.role)}</span>
                        )}
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" /> {formatDate(r.archivedAt)}
                        </span>
                        {r.asset && (
                          <span className="flex items-center gap-1 font-mono">
                            <Trash2 className="w-3 h-3" /> {formatBytes(r.asset.metadata.fileSize)}
                          </span>
                        )}
                      </div>
                    </div>
                    {r.asset && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => nav(`/asset/${r.assetId}`)} className="btn-ghost !px-3 !py-1.5 text-xs">
                          <Filter className="w-3.5 h-3.5" /> 查看
                        </button>
                        <button onClick={() => restoreOne(r.assetId)} className="btn-outline !px-3 !py-1.5 text-xs">
                          <Undo2 className="w-3.5 h-3.5" /> 恢复
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { t: '释放存储空间', d: '清理长期闲置或超大资源，降低存储成本与备份负担。', c: 'from-emerald-400 to-teal-500' },
          { t: '保留完整历史', d: '归档不删除数据，版本链完整保留，支持随时恢复。', c: 'from-brand-400 to-indigo-500' },
          { t: '操作全量留痕', d: '归档、恢复均记录操作人与时间，审计可追溯。', c: 'from-violet-400 to-pink-500' },
        ].map((f, i) => (
          <div key={i} className="glass p-5">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${f.c} grid place-items-center mb-3`}>
              <ArchiveIcon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-white font-medium mb-1">{f.t}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
