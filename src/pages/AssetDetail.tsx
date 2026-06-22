import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Box as R3FBox } from '@react-three/drei';
import * as THREE from 'three';
import {
  ArrowLeft, RotateCcw, AlertTriangle, Lock, Unlock, Upload, Archive,
  Grid3X3, Eye, Box, Maximize2, Layers, HardDrive, Tag, User as UserIcon,
  ChevronRight, Download, Settings, Undo2, Shapes, X, Plus,
} from 'lucide-react';
import api, { handleErr } from '@/api/client.js';
import type { AssetDetail, AssetVersion } from '../../../shared/types.js';
import { useAuth, useToast } from '@/store/auth.js';
import {
  formatBytes, formatDate, formatNumber, randomGradient, roleColor, roleLabel,
  summarizeMeta, typeColor, typeLabel, relativeTime,
} from '@/lib/utils.js';

function PlaceholderMesh({ type, seed }: { type: string; seed: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.2;
  });
  const palette = useMemo(() => {
    const colors = ['#38BDF8', '#6366F1', '#10B981', '#F59E0B', '#EC4899', '#14B8A6'];
    let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return [colors[h % colors.length], colors[(h + 2) % colors.length]];
  }, [seed]);
  const isTex = type === 'texture';
  return (
    <group>
      <mesh ref={ref} castShadow receiveShadow>
        {isTex ? (
          <planeGeometry args={[2, 2 * 0.75]} />
        ) : (
          <torusKnotGeometry args={[0.75, 0.26, 220, 36]} />
        )}
        <meshStandardMaterial
          color={palette[0]} metalness={0.6} roughness={0.22}
          emissive={palette[1]} emissiveIntensity={0.08}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-1.5} receiveShadow>
        <circleGeometry args={[2.4, 64]} />
        <meshStandardMaterial color="#0B1120" roughness={0.9} metalness={0.1} />
      </mesh>
    </group>
  );
}

function Scene3D({ type, seed, wireframe }: { type: string; seed: string; wireframe: boolean }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 6, 3]} intensity={1.1} castShadow shadow-mapSize={1024} />
      <directionalLight position={[-4, 3, -3]} intensity={0.5} color="#7DD3FC" />
      <directionalLight position={[0, -2, 4]} intensity={0.3} color="#A78BFA" />
      <PlaceholderMesh type={type} seed={seed} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={2} maxDistance={12} />
      <ContactShadows opacity={0.35} scale={7} blur={2.5} far={4} resolution={512} />
    </>
  );
}

interface VersionItemProps {
  v: AssetVersion;
  isCurrent: boolean;
  onRollback: (v: AssetVersion) => void;
  canEdit: boolean;
  rollingBack: string | null;
}
function VersionItem({ v, isCurrent, onRollback, canEdit, rollingBack }: VersionItemProps) {
  const [expanded, setExpanded] = useState(isCurrent);
  const meta = summarizeMeta(v.metadata);
  return (
    <div className="relative pl-6 pb-5 last:pb-0">
      <div className={`absolute left-[7px] top-2.5 w-3 h-3 rounded-full border-2 ${isCurrent ? 'bg-brand-400 border-brand-300 shadow-glow-sm animate-pulse-slow' : 'bg-space-800 border-space-600'}`} />
      <div className="absolute left-[12px] top-5 bottom-0 w-px bg-gradient-to-b from-brand-400/30 via-space-700 to-transparent" />
      <div
        onClick={() => setExpanded(e => !e)}
        className={`glass p-3 ml-2 cursor-pointer hover:border-brand-400/30 transition-all ${isCurrent ? 'border-brand-400/40 bg-brand-400/5' : ''}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`font-display text-sm ${isCurrent ? 'text-brand-300' : 'text-slate-300'}`}>v{v.version}</div>
            {isCurrent && <span className="chip bg-brand-400/15 border-brand-400/40 text-brand-300">当前版本</span>}
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <ChevronRight className="w-3 h-3" /> {relativeTime(v.createdAt)}
            </span>
          </div>
          {canEdit && !isCurrent && (
            <button
              onClick={(e) => { e.stopPropagation(); onRollback(v); }}
              disabled={rollingBack === v.id}
              className="chip cursor-pointer border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
            >
              <Undo2 className="w-3 h-3" /> {rollingBack === v.id ? '回退中…' : '回退到此'}
            </button>
          )}
        </div>
        {v.remark && <div className="mt-2 text-xs text-slate-400 italic">“{v.remark}”</div>}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-space-700/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">上传者</div>
                <div className="text-xs text-slate-300 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-gradient-to-br from-space-700 to-space-800 grid place-items-center text-[10px]">
                    {v.createdBy?.avatar || '👤'}
                  </span>
                  {v.createdBy?.displayName || '未知'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">时间</div>
                <div className="text-xs text-slate-300 font-mono">{formatDate(v.createdAt)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">大小</div>
                <div className="text-xs text-slate-300 font-mono">{formatBytes(v.metadata.fileSize)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">格式</div>
                <div className="text-xs text-slate-300 font-mono uppercase">{v.metadata.format}</div>
              </div>
            </div>
            {meta.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {meta.map((m, i) => (
                  <span key={i} className="chip border-space-700 bg-space-900/60 text-slate-400">{m}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const push = useToast(s => s.push);
  const canEdit = useAuth(s => s.canEdit());
  const isAdmin = useAuth(s => s.isAdmin());
  const currentUserId = useAuth(s => s.user?.id);
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showUploadVersion, setShowUploadVersion] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [savingTags, setSavingTags] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.assetDetail(id).then(r => setAsset(r)).catch(e => push('error', handleErr(e))).finally(() => setLoading(false));
  }, [id, push]);

  async function rollback(v: AssetVersion) {
    if (!asset) return;
    if (!canEdit) { push('warning', '您没有编辑权限，无法回退版本'); return; }
    if (asset.isLocked && asset.lockedByUser) { push('error', `该素材正被 ${asset.lockedByUser.displayName} 编辑中`); return; }
    if (!confirm(`确定将素材回退到 v${v.version} 版本？将生成一个新的版本节点。`)) return;
    setRollingBack(v.id);
    try {
      const r = await api.rollback(asset.id, v.id);
      if (r.success) {
        push('success', `已成功回退到 v${v.version}，新版本已生成`);
        const fresh = await api.assetDetail(asset.id);
        setAsset(fresh);
      }
    } catch (err) { push('error', handleErr(err)); }
    finally { setRollingBack(null); }
  }

  async function toggleLock() {
    if (!asset) return;
    setLocking(true);
    try {
      if (asset.isLocked) {
        await api.unlockAsset(asset.id);
        push('success', '已解除编辑锁定');
      } else {
        await api.lockAsset(asset.id);
        push('success', '已锁定素材，5分钟内他人无法编辑');
      }
      const fresh = await api.assetDetail(asset.id);
      setAsset(fresh);
    } catch (err) { push('error', handleErr(err)); }
    finally { setLocking(false); }
  }

  async function doArchive() {
    if (!asset) return;
    if (!confirm(`确定归档此素材？可在归档中心恢复。`)) return;
    setArchiving(true);
    try {
      await api.archive([asset.id], '从详情页归档');
      push('success', '素材已归档');
      nav('/archive');
    } catch (err) { push('error', handleErr(err)); }
    finally { setArchiving(false); }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!asset) return;
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const remark = prompt('请输入本次版本更新备注（可选）：', `在 v${asset.versionCount} 基础上迭代`);
      const r = await api.uploadAsset(f, remark || `更新至 v${asset.versionCount + 1}`, asset.id);
      if (r.success) {
        push('success', `新版本上传成功，v${asset.versionCount + 1}`);
        const fresh = await api.assetDetail(asset.id);
        setAsset(fresh);
        setShowUploadVersion(false);
      }
    } catch (err) { push('error', handleErr(err)); }
    finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  const isLockedByOther = asset?.isLocked && asset.lockedBy && asset.lockedBy !== currentUserId;
  const canEditTags = canEdit && !isLockedByOther;

  async function addTag() {
    if (!asset || !canEditTags) return;
    const tag = tagInput.trim();
    if (!tag) return;
    if (asset.tags.includes(tag)) { push('warning', '该标签已存在'); setTagInput(''); return; }
    const newTags = [...asset.tags, tag];
    setSavingTags(true);
    try {
      const r = await api.updateAssetTags(asset.id, newTags);
      if (r.success) {
        setAsset(r.asset);
        setTagInput('');
        push('success', '标签已添加');
      }
    } catch (err) { push('error', handleErr(err)); }
    finally { setSavingTags(false); }
  }

  async function removeTag(tagToRemove: string) {
    if (!asset || !canEditTags) return;
    const newTags = asset.tags.filter(t => t !== tagToRemove);
    setSavingTags(true);
    try {
      const r = await api.updateAssetTags(asset.id, newTags);
      if (r.success) {
        setAsset(r.asset);
        push('success', '标签已删除');
      }
    } catch (err) { push('error', handleErr(err)); }
    finally { setSavingTags(false); }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 glass animate-pulse" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[480px] glass animate-pulse" />
          <div className="h-[480px] glass animate-pulse" />
        </div>
      </div>
    );
  }
  if (!asset) {
    return (
      <div className="glass p-12 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h3 className="font-display text-white mb-2">素材不存在</h3>
        <button onClick={() => nav('/dashboard')} className="btn-outline mt-4"><ArrowLeft className="w-4 h-4" /> 返回素材库</button>
      </div>
    );
  }

  const meta = summarizeMeta(asset.metadata);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => nav(-1)} className="btn-ghost !p-2"><ArrowLeft className="w-5 h-5" /></button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`chip ${typeColor(asset.type)}`}>{typeLabel(asset.type)}</span>
              <span className="chip border-space-600/60 bg-space-900/60 text-slate-400 font-mono">v{asset.versionCount}</span>
              {asset.status === 'warning' && (
                <span className="chip bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse-slow"><AlertTriangle className="w-3 h-3" /> 超大预警</span>
              )}
              {asset.status === 'archived' && (
                <span className="chip bg-slate-500/20 border-slate-500/40 text-slate-300"><Archive className="w-3 h-3" /> 已归档</span>
              )}
              {asset.isLocked && (
                <span className="chip bg-rose-500/20 border-rose-500/40 text-rose-300">
                  <Lock className="w-3 h-3" /> {asset.lockedByUser?.displayName || '他人'}编辑中
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl text-white truncate">{asset.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <>
              <button onClick={() => setShowUploadVersion(true)} className="btn-outline">
                <Upload className="w-4 h-4" /> 上传新版本
              </button>
              <button onClick={toggleLock} disabled={locking} className={asset.isLocked && asset.lockedByUser ? 'btn-danger' : 'btn-warn'}>
                {asset.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {asset.isLocked ? '解除锁定' : '锁定编辑'}
              </button>
            </>
          )}
          <button className="btn-outline"><Download className="w-4 h-4" /> 下载</button>
          {(isAdmin || canEdit) && asset.status !== 'archived' && (
            <button onClick={doArchive} disabled={archiving} className="btn-danger">
              <Archive className="w-4 h-4" /> {archiving ? '归档中…' : '归档'}
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-strong overflow-hidden relative group">
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <span className="chip border-space-700 bg-space-900/80 text-slate-300">
              <Shapes className="w-3 h-3" /> 实时3D预览
            </span>
          </div>
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <button
              onClick={() => setWireframe(w => !w)}
              className={`chip cursor-pointer transition-all ${wireframe ? 'bg-brand-400/15 border-brand-400/40 text-brand-300' : 'border-space-700 bg-space-900/80 text-slate-400 hover:text-slate-200'}`}
            >
              <Grid3X3 className="w-3 h-3" /> {wireframe ? '实体' : '线框'}
            </button>
            <button className="chip cursor-pointer border-space-700 bg-space-900/80 text-slate-400 hover:text-slate-200 transition-all">
              <Maximize2 className="w-3 h-3" /> 全屏
            </button>
          </div>
          <div className="h-[480px] w-full" style={{ background: `radial-gradient(circle at 50% 40%, ${randomGradient(asset.id).split(', ')[0].replace('linear-gradient(135deg, ', '')}22 0%, transparent 60%)` }}>
            <Canvas shadows camera={{ position: [3.2, 2.4, 4], fov: 42 }} gl={{ antialias: true }}>
              <color attach="background" args={[wireframe ? '#0B1120' : '#0B1120']} />
              <fog attach="fog" args={['#0B1120', 6, 16]} />
              <Scene3D type={asset.type} seed={asset.id} wireframe={wireframe} />
              <Environment preset="city" />
            </Canvas>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Eye className="w-3 h-3" /> 拖拽旋转 · 滚轮缩放 · 右键平移
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {meta.map((m, i) => (
                <span key={i} className="chip border-space-700 bg-space-900/80">{m}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-brand-400" />
              <h3 className="font-display text-sm text-white">元数据</h3>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">文件大小</div>
                <div className="text-sm text-white font-mono">{formatBytes(asset.metadata.fileSize)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">格式</div>
                <div className="text-sm text-white font-mono uppercase">{asset.metadata.format}</div>
              </div>
              {asset.metadata.faces != null && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">三角面</div>
                  <div className="text-sm text-white font-mono">{formatNumber(asset.metadata.faces)}</div>
                </div>
              )}
              {asset.metadata.vertices != null && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">顶点数</div>
                  <div className="text-sm text-white font-mono">{formatNumber(asset.metadata.vertices)}</div>
                </div>
              )}
              {asset.metadata.width != null && asset.metadata.height != null && (
                <>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">分辨率</div>
                    <div className="text-sm text-white font-mono">{asset.metadata.width}×{asset.metadata.height}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">像素数</div>
                    <div className="text-sm text-white font-mono">{formatNumber(asset.metadata.width * asset.metadata.height)}</div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-space-700/60">
              <div className="flex items-center gap-2 mb-3">
                <UserIcon className="w-4 h-4 text-brand-400" />
                <h4 className="text-xs text-slate-300 font-medium">上传者信息</h4>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-space-700 to-space-800 grid place-items-center text-xl">
                  {asset.uploader?.avatar || '👤'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">{asset.uploader?.displayName || '未知'}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`chip ${roleColor(asset.uploader?.role || 'viewer')}`}>{roleLabel(asset.uploader?.role || 'viewer')}</span>
                    <span className="text-xs text-slate-500 font-mono">@{asset.uploader?.username}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-space-700/60">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">创建时间</div>
                  <div className="text-xs text-slate-300 font-mono">{formatDate(asset.createdAt)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">最后更新</div>
                  <div className="text-xs text-slate-300 font-mono">{formatDate(asset.updatedAt)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-brand-400" />
                <h3 className="font-display text-sm text-white">标签</h3>
              </div>
              {isLockedByOther && (
                <span className="chip bg-rose-500/20 border-rose-500/40 text-rose-300 text-[11px]">
                  <Lock className="w-3 h-3" /> {asset?.lockedByUser?.displayName}编辑中
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {asset.tags.length === 0 && !canEditTags && (
                <span className="text-xs text-slate-500 italic">暂无标签</span>
              )}
              {asset.tags.length === 0 && canEditTags && (
                <span className="text-xs text-slate-500 italic">还没有标签，在下方添加</span>
              )}
              {asset.tags.map((t, i) => (
                <span key={i} className={`chip border-brand-400/30 text-brand-200 bg-brand-400/10 inline-flex items-center gap-1 ${canEditTags ? 'pr-1' : ''}`}>
                  #{t}
                  {canEditTags && (
                    <button
                      onClick={() => removeTag(t)}
                      disabled={savingTags}
                      className="w-4 h-4 rounded-full hover:bg-rose-500/30 hover:text-rose-200 grid place-items-center transition-colors disabled:opacity-50"
                      title="删除标签"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {canEditTags && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addTag(); }}
                  placeholder="输入标签后回车添加"
                  className="input h-8 text-sm flex-1"
                  disabled={savingTags}
                />
                <button
                  onClick={addTag}
                  disabled={savingTags || !tagInput.trim()}
                  className="btn-primary !px-3 !py-1.5 text-sm disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> 添加
                </button>
              </div>
            )}
          </div>

          {asset.metadata.isOversized && (
            <div className="glass p-4 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse-slow" />
                <div>
                  <div className="text-sm text-amber-300 font-semibold">存储预警</div>
                  <div className="mt-1 text-xs text-slate-400">
                    该资源体积过大，建议：<br />
                    1. 面数优化 / LOD 分层<br />
                    2. 贴图压缩或尺寸下调<br />
                    3. 长期不用考虑归档
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-400" />
            <h3 className="font-display text-lg text-white">版本历史</h3>
            <span className="chip border-space-700 bg-space-900/60 text-slate-400">共 {asset.versions.length} 个版本</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <HardDrive className="w-3.5 h-3.5" /> 所有版本永久留存，点击任意卡片展开详情
          </div>
        </div>
        <div className="space-y-0.5">
          {asset.versions.map(v => (
            <VersionItem
              key={v.id}
              v={v}
              isCurrent={v.id === asset.currentVersionId}
              onRollback={rollback}
              canEdit={canEdit}
              rollingBack={rollingBack}
            />
          ))}
        </div>
      </div>

      <input ref={fileInput} type="file" className="hidden" onChange={handleFile} />
      {showUploadVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUploadVersion(false)} />
          <div className="relative glass-strong w-full max-w-lg p-6 animate-slide-up rounded-xl">
            <h3 className="font-display text-lg text-white mb-4">上传新版本</h3>
            <div className="text-sm text-slate-400 mb-4">
              将在 <span className="text-brand-300 font-medium">{asset.name}</span> 下创建新版本 v{asset.versionCount + 1}
            </div>
            <div
              onClick={() => fileInput.current?.click()}
              className="border-2 border-dashed border-brand-400/40 hover:border-brand-400 hover:bg-brand-400/5 rounded-xl p-10 text-center cursor-pointer transition-all group"
            >
              <Box className="w-12 h-12 mx-auto mb-3 text-brand-400 group-hover:scale-110 transition-transform" />
              <div className="text-white mb-1 group-hover:text-brand-300 transition-colors">点击或拖拽文件到此处</div>
              <div className="text-xs text-slate-500">GLB / GLTF / OBJ / FBX / PNG / JPG 等</div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowUploadVersion(false)} className="btn-ghost">取消</button>
              <button
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="btn-primary"
              >{uploading ? '上传中…' : '选择文件'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
