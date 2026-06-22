import { useEffect, useState } from 'react';
import {
  Users, Shield, ShieldAlert, ShieldCheck, Plus, Search, X,
  UserPlus, MoreVertical, Crown, Pencil, Eye, Ban, CheckCircle2,
} from 'lucide-react';
import api, { handleErr } from '@/api/client.js';
import type { User, UserRole } from '../../../shared/types.js';
import { useAuth, useToast } from '@/store/auth.js';
import { roleColor, roleLabel, formatDate } from '@/lib/utils.js';
import Modal from '@/components/ui/Modal.js';

const ROLE_OPTIONS: { v: UserRole; label: string; icon: typeof Eye; desc: string; color: string }[] = [
  { v: 'admin', label: '管理员', icon: Crown, desc: '全部权限：素材/用户/归档', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
  { v: 'editor', label: '编辑者', icon: Pencil, desc: '上传/编辑/回退版本/归档', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { v: 'viewer', label: '只读用户', icon: Eye, desc: '仅浏览/预览/下载，不可修改', color: 'text-sky-400 border-sky-500/40 bg-sky-500/10' },
];

interface FormState { username: string; password: string; displayName: string; role: UserRole; }
const emptyForm: FormState = { username: '', password: '', displayName: '', role: 'viewer' };

export default function UsersPage() {
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const push = useToast(s => s.push);

  function load() {
    setLoading(true);
    api.listUsers().then(r => setList(r.items)).catch(e => push('error', handleErr(e))).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [push]);

  const filtered = list.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return u.displayName.toLowerCase().includes(s) || u.username.toLowerCase().includes(s);
  });

  async function updateRole(u: User, role: UserRole) {
    if (u.role === role) return;
    try {
      await api.updateRole(u.id, role);
      push('success', `已将 ${u.displayName} 调整为「${roleLabel(role)}」`);
      setMenuFor(null);
      load();
    } catch (e) { push('error', handleErr(e)); }
  }

  async function toggleStatus(u: User) {
    const next = u.status === 'active' ? 'disabled' : 'active';
    if (!confirm(`确定${next === 'disabled' ? '禁用' : '启用'}用户「${u.displayName}」吗？`)) return;
    try {
      await api.setUserStatus(u.id, next);
      push('success', `已${next === 'disabled' ? '禁用' : '启用'}用户 ${u.displayName}`);
      setMenuFor(null);
      load();
    } catch (e) { push('error', handleErr(e)); }
  }

  async function submitCreate() {
    if (!form.username || !form.password || !form.displayName) {
      push('warning', '请填写完整的注册信息'); return;
    }
    if (form.password.length < 6) { push('warning', '密码至少 6 位'); return; }
    setSaving(true);
    try {
      await api.createUser(form);
      push('success', `已创建账号：${form.username}`);
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (e) { push('error', handleErr(e)); }
    finally { setSaving(false); }
  }

  async function submitEdit() {
    if (!showEdit) return;
    setSaving(true);
    try {
      await api.updateRole(showEdit.id, form.role);
      push('success', `已更新 ${showEdit.displayName} 的权限`);
      setShowEdit(null);
      load();
    } catch (e) { push('error', handleErr(e)); }
    finally { setSaving(false); }
  }

  const count = {
    total: list.length,
    admin: list.filter(x => x.role === 'admin').length,
    editor: list.filter(x => x.role === 'editor').length,
    viewer: list.filter(x => x.role === 'viewer').length,
    disabled: list.filter(x => x.status === 'disabled').length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-white mb-1">成员与权限管理</h1>
          <p className="text-sm text-slate-500">为团队成员分配账号，并精细控制素材操作权限。</p>
        </div>
        <button onClick={() => { setForm({ ...emptyForm, role: 'viewer' }); setShowCreate(true); }} className="btn-primary">
          <UserPlus className="w-4 h-4" /> 新增成员
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: '总成员', v: count.total, icon: Users, c: 'from-brand-400 to-indigo-500' },
          { label: '管理员', v: count.admin, icon: ShieldAlert, c: 'from-rose-400 to-pink-500' },
          { label: '编辑者', v: count.editor, icon: ShieldCheck, c: 'from-amber-400 to-orange-500' },
          { label: '只读用户', v: count.viewer, icon: Shield, c: 'from-sky-400 to-blue-500' },
          { label: '已禁用', v: count.disabled, icon: Ban, c: 'from-slate-500 to-slate-600' },
        ].map((s, i) => (
          <div key={i} className="glass p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.c} grid place-items-center shrink-0`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">{s.label}</div>
              <div className="font-display text-xl text-white">{s.v}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-strong overflow-hidden">
        <div className="px-5 py-4 border-b border-space-700/60 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索姓名或账号..." className="input pl-9 h-10" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'admin', 'editor', 'viewer'] as const).map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`chip cursor-pointer transition-all
                  ${roleFilter === r
                    ? 'bg-brand-400/15 border-brand-400/50 text-brand-300'
                    : 'border-space-700 text-slate-400 hover:border-space-600 hover:text-slate-200'}`}
              >
                {r === 'all' ? '全部角色' : roleLabel(r)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-500 bg-space-800/40">
                <th className="text-left px-5 py-3 font-medium">成员</th>
                <th className="text-left px-5 py-3 font-medium">账号</th>
                <th className="text-left px-5 py-3 font-medium">角色</th>
                <th className="text-left px-5 py-3 font-medium">状态</th>
                <th className="text-left px-5 py-3 font-medium">加入时间</th>
                <th className="text-right px-5 py-3 font-medium w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-space-700/40">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-5 bg-space-800 rounded animate-pulse w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center">
                  <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <div className="text-slate-400 text-sm">没有找到匹配的成员</div>
                </td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="border-t border-space-700/40 hover:bg-space-800/30 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-space-700 to-space-800 grid place-items-center text-lg shrink-0 ring-2 ring-space-700 group-hover:ring-brand-400/40 transition-all">
                        {u.avatar || '👤'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-medium">{u.displayName}</div>
                        <div className="text-[11px] text-slate-500">ID: {u.id.slice(0, 16)}…</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <code className="text-slate-300 font-mono text-xs bg-space-900/70 px-2 py-1 rounded border border-space-700/60">@{u.username}</code>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`chip ${roleColor(u.role)}`}>{roleLabel(u.role)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.status === 'active' ? (
                      <span className="chip border-emerald-500/40 text-emerald-300 bg-emerald-500/10"><CheckCircle2 className="w-3 h-3" /> 正常</span>
                    ) : (
                      <span className="chip border-rose-500/40 text-rose-300 bg-rose-500/10"><Ban className="w-3 h-3" /> 已禁用</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-3.5 text-right relative">
                    <button onClick={() => setMenuFor(menuFor === u.id ? null : u.id)}
                      className="btn-ghost !p-1.5 inline-flex">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuFor === u.id && (
                      <div className="absolute right-4 top-full mt-1 glass-strong w-56 py-1.5 text-left animate-slide-up z-10">
                        <button onClick={() => { setShowEdit(u); setForm({ username: u.username, password: '', displayName: u.displayName, role: u.role }); setMenuFor(null); }}
                          className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-space-700/50 hover:text-white flex items-center gap-2 transition-colors">
                          <Pencil className="w-4 h-4" /> 修改角色
                        </button>
                        {u.role !== 'admin' && (
                          <div className="px-1.5 py-1 border-t border-space-700/50 mt-1">
                            {ROLE_OPTIONS.filter(o => o.v !== u.role).map(o => (
                              <button key={o.v} onClick={() => updateRole(u, o.v)}
                                className={`w-full px-2 py-1.5 rounded-md text-left text-xs flex items-center gap-2 hover:bg-space-700/40 transition-colors`}>
                                <o.icon className={`w-3.5 h-3.5 ${o.color.split(' ')[0]}`} />
                                <span className="text-slate-300">改为 {o.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="px-1.5 py-1 border-t border-space-700/50 mt-1">
                          <button onClick={() => toggleStatus(u)}
                            className={`w-full px-2 py-1.5 rounded-md text-left text-xs flex items-center gap-2 hover:bg-space-700/40 transition-colors
                              ${u.status === 'active' ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {u.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            {u.status === 'active' ? '禁用账号' : '启用账号'}
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {ROLE_OPTIONS.map(o => (
          <div key={o.v} className="glass p-5">
            <div className={`w-11 h-11 rounded-xl grid place-items-center mb-4 border-2 ${o.color}`}>
              <o.icon className="w-5 h-5" />
            </div>
            <h3 className="font-display text-white mb-1">{o.label}</h3>
            <p className="text-xs text-slate-400 mb-3">{o.desc}</p>
            <ul className="space-y-1.5 text-xs text-slate-400">
              {o.v === 'admin' && (
                <>
                  <li>• 管理全部素材（新增/编辑/删除/归档）</li>
                  <li>• 创建、禁用成员账号</li>
                  <li>• 调整任意成员角色权限</li>
                  <li>• 强制解除编辑锁</li>
                </>
              )}
              {o.v === 'editor' && (
                <>
                  <li>• 上传新素材与新版本迭代</li>
                  <li>• 回退素材到任意历史版本</li>
                  <li>• 归档与恢复素材</li>
                  <li>• 锁定自己正在编辑的素材</li>
                </>
              )}
              {o.v === 'viewer' && (
                <>
                  <li>• 浏览素材库与搜索过滤</li>
                  <li>• 3D 在线预览与查看元数据</li>
                  <li>• 下载素材文件</li>
                  <li>• <span className="text-rose-400">禁止</span>任何修改操作</li>
                </>
              )}
            </ul>
          </div>
        ))}
      </div>

      <Modal open={showCreate} onClose={() => !saving && setShowCreate(false)} title="新增团队成员" size="md"
        footer={<>
          <button onClick={() => setShowCreate(false)} disabled={saving} className="btn-ghost">取消</button>
          <button onClick={submitCreate} disabled={saving} className="btn-primary">
            {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 创建中…</> : <><Plus className="w-4 h-4" /> 创建账号</>}
          </button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">显示姓名</label>
            <input className="input h-10" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="如：设计师小张" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">登录账号</label>
              <input className="input h-10" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.trim().toLowerCase() }))}
                placeholder="英文/数字" />
            </div>
            <div>
              <label className="label">初始密码</label>
              <input type="text" className="input h-10" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="至少 6 位" />
            </div>
          </div>
          <div>
            <label className="label">分配角色</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map(o => (
                <button key={o.v} type="button" onClick={() => setForm(f => ({ ...f, role: o.v }))}
                  className={`p-3 rounded-lg border-2 text-left transition-all hover:scale-[1.02]
                    ${form.role === o.v ? `${o.color} shadow-glow-sm` : 'border-space-700 bg-space-900/40 hover:border-space-600'}`}
                >
                  <o.icon className={`w-5 h-5 mb-1 ${o.color.split(' ')[0]}`} />
                  <div className={`text-sm font-medium ${form.role === o.v ? 'text-white' : 'text-slate-300'}`}>{o.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!showEdit} onClose={() => !saving && setShowEdit(null)} title={`调整成员权限 · ${showEdit?.displayName}`} size="md"
        footer={<>
          <button onClick={() => setShowEdit(null)} disabled={saving} className="btn-ghost">取消</button>
          <button onClick={submitEdit} disabled={saving || showEdit?.role === form.role} className="btn-primary">
            {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 保存中…</> : <><CheckCircle2 className="w-4 h-4" /> 确认修改</>}
          </button>
        </>}
      >
        <div className="space-y-4">
          <div className="glass p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-space-700 to-space-800 grid place-items-center text-2xl">
              {showEdit?.avatar || '👤'}
            </div>
            <div className="min-w-0">
              <div className="text-white font-medium">{showEdit?.displayName}</div>
              <div className="text-xs text-slate-500 font-mono">@{showEdit?.username}</div>
              <span className={`chip ${roleColor(showEdit?.role || 'viewer')} mt-1`}>当前：{roleLabel(showEdit?.role || 'viewer')}</span>
            </div>
          </div>
          <div>
            <label className="label">选择新角色</label>
            <div className="grid grid-cols-1 gap-2">
              {ROLE_OPTIONS.map(o => (
                <button key={o.v} type="button" onClick={() => setForm(f => ({ ...f, role: o.v }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4
                    ${form.role === o.v ? `${o.color} shadow-glow-sm` : 'border-space-700 bg-space-900/40 hover:border-space-600'}`}
                >
                  <o.icon className={`w-6 h-6 shrink-0 ${o.color.split(' ')[0]}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium ${form.role === o.v ? 'text-white' : 'text-slate-200'}`}>{o.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{o.desc}</div>
                  </div>
                  {form.role === o.v && <CheckCircle2 className={`w-5 h-5 shrink-0 ${o.color.split(' ')[0]}`} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {menuFor && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
      )}
    </div>
  );
}
