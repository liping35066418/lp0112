import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload as UploadIcon, FileUp, X, CheckCircle2, AlertTriangle, FileText,
  Box, Image as ImageIcon, FileQuestion, FolderOpen, Sparkles, ArrowRight,
} from 'lucide-react';
import api, { handleErr } from '@/api/client.js';
import type { AssetMetadata } from '../../../shared/types.js';
import { useToast } from '@/store/auth.js';
import { formatBytes, formatNumber } from '@/lib/utils.js';

interface UploadingItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  metadata?: AssetMetadata;
  assetId?: string;
  versionId?: string;
  remark: string;
}

function detectTypeIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext) return FileQuestion;
  if (['glb', 'gltf', 'obj', 'fbx', 'usdz', 'stl'].includes(ext)) return Box;
  if (['png', 'jpg', 'jpeg', 'tga', 'tif', 'tiff', 'bmp', 'exr', 'hdr'].includes(ext)) return ImageIcon;
  return FileQuestion;
}

export default function UploadPage() {
  const nav = useNavigate();
  const push = useToast(s => s.push);
  const [items, setItems] = useState<UploadingItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const totalDone = items.filter(x => x.status === 'done').length;
  const allDone = items.length > 0 && items.every(x => x.status === 'done' || x.status === 'error');

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).map<UploadingItem>(f => ({
      id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      progress: 0,
      status: 'pending',
      remark: '',
    }));
    setItems(prev => [...prev, ...arr]);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  function removeItem(id: string) {
    setItems(prev => prev.filter(x => x.id !== id));
  }
  function updateRemark(id: string, v: string) {
    setItems(prev => prev.map(x => x.id === id ? { ...x, remark: v } : x));
  }

  async function startAll() {
    if (items.length === 0 || uploading) return;
    setUploading(true);
    for (const it of items) {
      if (it.status !== 'pending') continue;
      setItems(prev => prev.map(x => x.id === it.id ? { ...x, status: 'uploading', progress: 5 } : x));
      try {
        const progressTimer = setInterval(() => {
          setItems(prev => prev.map(x => {
            if (x.id !== it.id || x.status !== 'uploading') return x;
            return { ...x, progress: Math.min(92, x.progress + Math.random() * 18) };
          }));
        }, 180);
        const r = await api.uploadAsset(it.file, it.remark || `初始版本 · ${it.file.name}`);
        clearInterval(progressTimer);
        setItems(prev => prev.map(x => x.id === it.id
          ? { ...x, status: 'done', progress: 100, metadata: r.metadata, assetId: r.assetId, versionId: r.versionId }
          : x));
        push('success', `上传完成：${it.file.name}`);
      } catch (err) {
        setItems(prev => prev.map(x => x.id === it.id ? { ...x, status: 'error', error: handleErr(err) } : x));
        push('error', `${it.file.name} 上传失败：${handleErr(err)}`);
      }
    }
    setUploading(false);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl text-white mb-1">上传素材</h1>
        <p className="text-sm text-slate-500">支持模型与贴图混合批量上传，系统自动解析面数 / 分辨率并标记超大资源。</p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 rounded-2xl p-14 text-center cursor-pointer transition-all overflow-hidden group
          ${dragging
            ? 'border-brand-400 bg-brand-400/10 shadow-glow scale-[1.01]'
            : 'border-dashed border-space-700 hover:border-brand-400/60 hover:bg-brand-400/5 glass'}`}
      >
        <div className={`absolute inset-0 transition-opacity ${dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
          style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative">
          <div className={`w-20 h-20 mx-auto rounded-3xl grid place-items-center mb-5 transition-all
            ${dragging
              ? 'bg-gradient-to-br from-brand-400 to-indigo-500 scale-110 shadow-glow'
              : 'bg-gradient-to-br from-brand-500/20 to-indigo-500/20 border border-brand-400/30 group-hover:scale-105'}`}>
            <UploadIcon className={`w-10 h-10 ${dragging ? 'text-white' : 'text-brand-300'} transition-transform ${dragging ? '-translate-y-1' : ''}`} />
          </div>
          <h2 className="font-display text-xl text-white mb-2">
            {dragging ? '松开即可上传' : '拖拽文件到此处'}
          </h2>
          <p className="text-sm text-slate-400 mb-5">
            或 <span className="text-brand-400 underline underline-offset-2">点击选择文件</span>，单文件最大 2GB
          </p>
          <div className="inline-flex items-center gap-2 text-xs text-slate-500 flex-wrap justify-center">
            <span className="chip border-space-700 bg-space-900/60"><Box className="w-3 h-3" /> GLB / GLTF / OBJ / FBX</span>
            <span className="chip border-space-700 bg-space-900/60"><ImageIcon className="w-3 h-3" /> PNG / JPG / TGA / EXR</span>
            <span className="chip border-space-700 bg-space-900/60"><Sparkles className="w-3 h-3" /> 自动解析元数据</span>
          </div>
        </div>
        <input ref={fileRef} type="file" multiple
          accept=".glb,.gltf,.obj,.fbx,.usdz,.stl,.png,.jpg,.jpeg,.tif,.tiff,.tga,.bmp,.exr,.hdr,.psd,.zip"
          className="hidden"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <div className="glass-strong overflow-hidden">
          <div className="px-5 py-4 border-b border-space-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-brand-400" />
              <div>
                <div className="text-white font-medium">文件队列</div>
                <div className="text-xs text-slate-500">
                  共 {items.length} 个文件 · 已完成 {totalDone}
                  {items.some(x => x.status === 'error') && <span className="text-rose-400 ml-2">· 失败 {items.filter(x => x.status === 'error').length}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setItems([])} className="btn-ghost" disabled={uploading}>
                <X className="w-4 h-4" /> 清空
              </button>
              <button onClick={startAll} disabled={uploading || allDone} className="btn-primary">
                {uploading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 上传中…</>
                ) : allDone ? (
                  <><CheckCircle2 className="w-4 h-4" /> 全部完成，继续添加</>
                ) : (
                  <><FileUp className="w-4 h-4" /> 开始上传 ({items.filter(x => x.status === 'pending').length})</>
                )}
              </button>
            </div>
          </div>
          <ul className="divide-y divide-space-700/50">
            {items.map(it => {
              const Icon = detectTypeIcon(it.file.name);
              const isTex = Icon === ImageIcon;
              const m = it.metadata;
              return (
                <li key={it.id} className="p-4 hover:bg-space-800/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl grid place-items-center shrink-0
                      ${it.status === 'error'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : it.status === 'done'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-brand-400/10 text-brand-300 border border-brand-400/20'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-white truncate font-medium">{it.file.name}</div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                            <span>{formatBytes(it.file.size)}</span>
                            {it.status === 'pending' && <span className="text-slate-500">等待上传</span>}
                            {it.status === 'uploading' && <span className="text-brand-300">上传中 {Math.round(it.progress)}%</span>}
                            {it.status === 'done' && (
                              <span className="text-emerald-400 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> 上传成功
                              </span>
                            )}
                            {it.status === 'error' && (
                              <span className="text-rose-400 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {it.error}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {it.status === 'done' && it.assetId && (
                            <button onClick={() => nav(`/asset/${it.assetId}`)} className="btn-outline !px-2 !py-1">
                              查看 <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          {it.status !== 'uploading' && (
                            <button onClick={() => removeItem(it.id)} className="btn-ghost !p-1.5" title="移除">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {(it.status === 'pending' || it.status === 'uploading') && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <label className="text-[11px] text-slate-500 uppercase tracking-wider">版本备注（可选）</label>
                          </div>
                          <input
                            value={it.remark} onChange={e => updateRemark(it.id, e.target.value)}
                            placeholder="如：初始上传 / 拓扑优化版 / 甲方反馈修改稿…"
                            className="input h-9 text-sm !py-1"
                            disabled={it.status === 'uploading'}
                          />
                        </div>
                      )}

                      {it.status !== 'done' && it.status !== 'error' && (
                        <div className="mt-3 h-1.5 rounded-full bg-space-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300
                              ${it.status === 'uploading'
                                ? 'bg-gradient-to-r from-brand-400 to-indigo-500'
                                : 'bg-space-700'}`}
                            style={{ width: `${it.progress}%` }}
                          />
                        </div>
                      )}

                      {it.status === 'done' && m && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="glass !rounded-lg p-2 border-none">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">格式</div>
                            <div className="text-xs text-slate-200 font-mono uppercase">{m.format}</div>
                          </div>
                          {m.faces != null && (
                            <div className="glass !rounded-lg p-2 border-none">
                              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">三角面</div>
                              <div className="text-xs text-slate-200 font-mono">{formatNumber(m.faces)}</div>
                            </div>
                          )}
                          {m.vertices != null && (
                            <div className="glass !rounded-lg p-2 border-none">
                              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">顶点</div>
                              <div className="text-xs text-slate-200 font-mono">{formatNumber(m.vertices)}</div>
                            </div>
                          )}
                          {m.width != null && m.height != null && (
                            <div className="glass !rounded-lg p-2 border-none">
                              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">分辨率</div>
                              <div className="text-xs text-slate-200 font-mono">{m.width}×{m.height}</div>
                            </div>
                          )}
                          {!m.faces && !m.vertices && !m.width && (
                            <div className="glass !rounded-lg p-2 border-none">
                              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">大小</div>
                              <div className="text-xs text-slate-200 font-mono">{formatBytes(m.fileSize)}</div>
                            </div>
                          )}
                          {m.isOversized && (
                            <div className="glass !rounded-lg p-2 border-amber-500/30 bg-amber-500/5 sm:col-span-2">
                              <div className="flex items-center gap-2 text-xs text-amber-300">
                                <AlertTriangle className="w-3.5 h-3.5" /> 标记为超大资源，建议优化后重新上传
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { t: '自动元数据解析', d: '自动解析 3D 模型面数、顶点数；识别贴图分辨率、通道数', icon: Sparkles, c: 'from-brand-400 to-indigo-500' },
          { t: '超大资源预警', d: '超过阈值（模型100MB/贴图50MB/面数500万）自动标记并提示', icon: AlertTriangle, c: 'from-amber-400 to-rose-500' },
          { t: '版本自动编号', d: '同名素材再次上传自动累加版本号，保留完整迭代历史', icon: FileText, c: 'from-emerald-400 to-teal-500' },
        ].map((f, i) => (
          <div key={i} className="glass p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${f.c} grid place-items-center shrink-0`}>
              <f.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm text-white font-medium mb-0.5">{f.t}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{f.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
