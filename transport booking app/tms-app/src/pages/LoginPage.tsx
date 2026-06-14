import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useLoginMutation } from '@/hooks/useAuth';
import { useRole, ROLE_HOME } from '@/context/role';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();
  const { role, isInitializing, login } = useRole();
  const { mutate, isPending, error } = useLoginMutation();

  if (isInitializing) return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500 text-white font-black text-sm">
          TMS
        </div>
        <div className="h-5 w-5 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
      </div>
    </div>
  );

  // Already logged in — go straight to the role's home page
  if (role) return <Navigate to={ROLE_HOME[role]} replace />;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ username, password }, {
      onSuccess: (user) => {
        login(user);
        navigate(ROLE_HOME[user.role] ?? '/');
      },
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500 text-white font-black text-lg shadow-2xl shadow-blue-500/40">
            TMS
          </div>
          <h1 className="text-2xl font-black text-white">KNS Logistics</h1>
          <p className="mt-1 text-sm text-blue-300">Transport Management System</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-blue-300">ระบบพร้อมใช้งาน</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-6 shadow-2xl">
          <h2 className="text-center text-sm font-semibold text-white/70 mb-5">เข้าสู่ระบบ</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                ชื่อผู้ใช้ (Username)
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin / driver / manager"
                required
                autoComplete="username"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 pr-11 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !username || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPending
                ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <LogIn className="h-4 w-4" />
              }
              {isPending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>

        {/* Role hints */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { role: 'Admin', hint: 'จัดการจอง', color: 'text-blue-300' },
            { role: 'Driver', hint: 'พนักงานขับ', color: 'text-emerald-300' },
            { role: 'Manager', hint: 'ดูภาพรวม', color: 'text-purple-300' },
          ].map(r => (
            <div key={r.role} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-center">
              <p className={`text-xs font-bold ${r.color}`}>{r.role}</p>
              <p className="text-xs text-white/40">{r.hint}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          KNS Transport · Hazardous Logistics &amp; EV Fleet Management
        </p>
      </div>
    </div>
  );
}
