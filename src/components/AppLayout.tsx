import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Users, Archive, LogOut, Search, Bell,
  Box, HardDrive, AlertTriangle,
} from 'lucide-react';
import { useAuth, useFilters } from '@/store/auth.js';
import { roleLabel, roleColor, formatBytes } from '@/lib/utils.js';
import { useEffect, useState } from 'react';
import api from '@/api/client.js';
import type { StorageStatus } from '../../../shared/types.js';

function Sidebar() {
  const user = useAuth(s => s.user);
  const isAdmin = useAuth(s => s.isAdmin());
  const canEdit = useAuth(s => s.canEdit());
  const navItems = [
    { to: '/dashboard', label: '素材库', icon: LayoutDashboard, show: true },
    { to: '/upload', label: '上传素材', icon: Upload, show: canEdit },
    { to: '/users', label: '成员权限', icon: Users, show: isAdmin },
    { to: '/archive', label: '归档中心', icon: Archive, show: canEdit },
  ].filter(x => x.show);
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 border-r border-space-700/60 bg-space-900/70 backdrop-blur-xl flex flex-col">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-space-700/60">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center shadow-glow-sm">
          <Box className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="font-display text-base text-white leading-tight">ASSET HUB</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest">3D Asset Manager</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-space-700/60">
        <div className="glass-strong p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-space-700 to-space-800 flex items-center justify-center text-lg">
            {user?.avatar || '👤'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white truncate">{user?.displayName}</div>
            <span className={`chip ${roleColor(user?.role || 'viewer')} mt-1`}>{roleLabel(user?.role || 'viewer')}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  const user = useAuth(s => s.user);
  const logout = useAuth(s => s.logout);
  const navigate = useNavigate();
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [menu, setMenu] = useState(false);
  const search = useFilters(s => s.search);
  const setSearch = useFilters(s => s.setSearch);
  useEffect(() => {
    api.storageStatus().then(setStatus).catch(() => {});
  }, []);
  const percent = status ? Math.min(100, (status.usedBytes / status.totalBytes) * 100) : 0;
  const warn = percent >= (status?.warningThreshold || 80);
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-space-700/60 bg-space-900/75 backdrop-blur-xl flex items-center gap-4 px-6">
      <div className="relative flex-1 max-w-xl">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索素材名称、标签..."
          className="input pl-9 h-10"
        />
      </div>
      <div className="flex items-center gap-3">
        {status && (
          <div className="flex items-center gap-3 glass px-3 py-2 min-w-[260px]">
            <div className={`${warn ? 'text-amber-400 animate-pulse-slow' : 'text-brand-400'}`}>
              {warn ? <AlertTriangle className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>存储空间</span>
                <span className={warn ? 'text-amber-400' : ''}>{formatBytes(status.usedBytes)} / {formatBytes(status.totalBytes)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-space-700 overflow-hidden">
                <div className={`h-full transition-all ${warn ? 'bg-gradient-to-r from-amber-400 to-rose-500' : 'bg-gradient-to-r from-brand-400 to-indigo-500'}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          </div>
        )}
        <button className="relative w-9 h-9 rounded-lg border border-space-700 hover:border-space-600 hover:bg-space-800/60 grid place-items-center text-slate-400 hover:text-white transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
        </button>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-space-800/60 transition-colors">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-space-700 to-space-800 grid place-items-center text-sm">{user?.avatar || '👤'}</div>
            <span className="text-sm text-slate-300">{user?.displayName}</span>
          </button>
          {menu && (
            <div className="absolute right-0 mt-2 w-48 glass-strong py-2 animate-slide-up">
              <div className="px-3 py-2 border-b border-space-700/60">
                <div className="text-sm text-white">{user?.displayName}</div>
                <div className="text-xs text-slate-500">{user?.username}</div>
              </div>
              <button onClick={() => { setMenu(false); logout(); navigate('/login', { replace: true }); }}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-space-700/60 hover:text-rose-400 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" /> 退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function AppLayout() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
