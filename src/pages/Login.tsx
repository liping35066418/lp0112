import { useState, FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Box, Eye, EyeOff, Lock, User as UserIcon, Sparkles } from 'lucide-react';
import { useAuth, useToast } from '@/store/auth.js';
import api, { handleErr } from '@/api/client.js';

export default function LoginPage() {
  const token = useAuth(s => s.token);
  const login = useAuth(s => s.login);
  const push = useToast(s => s.push);
  const nav = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password) { push('warning', '请输入账号和密码'); return; }
    setLoading(true);
    try {
      const r = await api.login({ username: username.trim(), password });
      login(r.token, r.user);
      push('success', `欢迎回来，${r.user.displayName}`);
      nav('/dashboard', { replace: true });
    } catch (err) {
      push('error', handleErr(err));
    } finally {
      setLoading(false);
    }
  }

  const quickAccounts = [
    { u: 'admin', p: 'admin123', label: '管理员', desc: '全部权限' },
    { u: 'editor', p: 'editor123', label: '设计师', desc: '可编辑' },
    { u: 'viewer', p: 'viewer123', label: '只读', desc: '仅浏览' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>
      <div className="absolute inset-0 pointer-events-none opacity-20"
        style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.12) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      <div className="relative w-full max-w-5xl grid md:grid-cols-2 gap-8 items-stretch">
        <div className="hidden md:flex flex-col justify-between glass-strong p-8 rounded-2xl overflow-hidden relative">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-indigo-500 grid place-items-center shadow-glow">
                <Box className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="font-display text-2xl text-white">ASSET HUB</div>
                <div className="text-xs text-slate-500 uppercase tracking-[0.2em]">Team 3D Asset Manager</div>
              </div>
            </div>
            <h1 className="font-display text-4xl text-white leading-tight mb-4">
              团队3D素材<br />
              <span className="bg-gradient-to-r from-brand-300 to-indigo-300 bg-clip-text text-transparent">资产管理中枢</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              解决版本混乱、文件覆盖、权限不清的协作痛点。自动解析元数据、版本永久留存、细粒度权限管控，让每一份资产都可追溯。
            </p>
          </div>
          <ul className="space-y-3 relative">
            {[
              { t: '元数据自动解析', d: '面数 / 顶点 / 分辨率 / 超大预警' },
              { t: '多版本永久留存', d: '任意历史版本一键回退' },
              { t: '细粒度权限', d: '只读 / 编辑 / 管理员 三角色划分' },
              { t: '并发编辑拦截', d: '多人同时修改自动校验与提示' },
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 w-6 h-6 rounded-md bg-brand-400/15 border border-brand-400/30 grid place-items-center shrink-0">
                  <Sparkles className="w-3 h-3 text-brand-300" />
                </div>
                <div>
                  <div className="text-slate-200 font-medium">{f.t}</div>
                  <div className="text-slate-500 text-xs">{f.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-strong rounded-2xl p-8 shadow-2xl">
          <h2 className="font-display text-2xl text-white mb-1">账号登录</h2>
          <p className="text-slate-500 text-sm mb-6">使用分配的账号进入资产管理系统</p>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="label">账号</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={username} onChange={e => setUsername(e.target.value)}
                  className="input pl-10 h-11" placeholder="username"
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <label className="label">密码</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="input pl-10 pr-10 h-11" placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center text-slate-500 hover:text-slate-300 rounded-md">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full h-11 text-base relative overflow-hidden group">
              <span className={`${loading ? 'opacity-0' : ''}`}>登 录</span>
              {loading && (
                <span className="absolute inset-0 grid place-items-center">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-7 pt-5 border-t border-space-700/60">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-3">快速体验账号</div>
            <div className="grid grid-cols-3 gap-2">
              {quickAccounts.map(a => (
                <button key={a.u} type="button"
                  onClick={() => { setUsername(a.u); setPassword(a.p); }}
                  className="p-3 rounded-lg border border-space-700 hover:border-brand-400/40 hover:bg-brand-400/5 text-left transition-all group">
                  <div className="text-sm text-white group-hover:text-brand-300 transition-colors">{a.label}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{a.desc}</div>
                  <code className="mt-2 block text-[10px] text-slate-400 font-mono">{a.u}</code>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
