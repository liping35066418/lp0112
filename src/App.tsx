import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import AssetDetail from '@/pages/AssetDetail';
import Upload from '@/pages/Upload';
import Users from '@/pages/Users';
import Archive from '@/pages/Archive';
import AppLayout from '@/components/AppLayout';
import Toaster from '@/components/ui/Toaster';
import { useAuth } from '@/store/auth';

function ProtectedRoute({ role }: { role?: 'admin' | 'editor' }) {
  const { token, user } = useAuth();
  const loc = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (role === 'admin' && user?.role !== 'admin') {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="glass-strong p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 grid place-items-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="font-display text-2xl text-white mb-2">权限不足</h2>
          <p className="text-sm text-slate-400 mb-6">该页面仅管理员可访问，请联系管理员调整权限。</p>
          <button onClick={() => history.back()} className="btn-outline">返回上一页</button>
        </div>
      </div>
    );
  }
  if (role === 'editor' && user?.role === 'viewer') {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="glass-strong p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 grid place-items-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="font-display text-2xl text-white mb-2">只读账号</h2>
          <p className="text-sm text-slate-400 mb-6">您当前的账号为只读权限，无法进行素材修改/上传等操作。</p>
          <button onClick={() => history.back()} className="btn-outline">返回上一页</button>
        </div>
      </div>
    );
  }
  return <Outlet />;
}

export default function App() {
  const token = useAuth(s => s.token);
  useEffect(() => {
    const apply = () => {
      if (document.documentElement.classList.contains('dark')) return;
      document.documentElement.classList.add('dark');
    };
    apply();
  }, []);

  return (
    <Router>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/asset/:id" element={<AssetDetail />} />
            <Route element={<ProtectedRoute role="editor" />}>
              <Route path="/upload" element={<Upload />} />
              <Route path="/archive" element={<Archive />} />
            </Route>
            <Route element={<ProtectedRoute role="admin" />}>
              <Route path="/users" element={<Users />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </Router>
  );
}
