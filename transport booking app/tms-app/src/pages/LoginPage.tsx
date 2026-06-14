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
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#00205C]">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFB800] text-[#00205C] font-black text-sm">
          KN
        </div>
        <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-[#FFB800] animate-spin" />
      </div>
    </div>
  );

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
    <div className="flex min-h-[100dvh]">

      {/* Brand panel — hidden on mobile */}
      <div className="hidden lg:flex w-[56%] flex-col justify-between bg-[#00205C] p-10 relative overflow-hidden">

        {/* Geometric decorations — CSS only, compositor-safe */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full border border-white/[0.04]" />
        <div className="pointer-events-none absolute top-0 right-16 h-60 w-60 rounded-full border border-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-[28rem] w-[28rem] rounded-full bg-[#003087]/30" />
        <div className="pointer-events-none absolute bottom-36 right-6 h-36 w-36 rotate-12 rounded-3xl bg-[#FFB800]/[0.07]" />
        <div className="pointer-events-none absolute top-1/2 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

        {/* Top: Brand mark */}
        <div className="relative z-10">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFB800] text-[#00205C] font-black text-sm">
              KN
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-white">KNS Logistics</p>
              <p className="text-xs text-white/30">Katoen Natie Group</p>
            </div>
          </div>

          <h1 className="text-[2.75rem] font-black leading-[1.08] tracking-tighter text-white mb-5">
            Transport<br />Management<br />System
          </h1>

          <p className="max-w-xs text-sm leading-relaxed text-white/45">
            ระบบจัดการการขนส่งแบบครบวงจร สำหรับโลจิสติกส์สารเคมีอันตราย และกองยาน EV
          </p>
        </div>

        {/* Mid: Feature list */}
        <div className="relative z-10 space-y-5">
          {[
            { title: 'Hazmat Compliant', desc: 'จัดการสินค้าอันตรายตามมาตรฐาน ADR/IMDG' },
            { title: 'Real-time Tracking', desc: 'ติดตามรถทุกเส้นทางแบบสด' },
            { title: 'Multi-role Platform', desc: 'Driver · Manager · Admin · Logistics · CS' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFB800]" />
              <div>
                <p className="text-sm font-semibold text-white/90">{f.title}</p>
                <p className="text-xs text-white/35">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: Footer */}
        <p className="relative z-10 text-xs text-white/15">
          &copy; 2026 Katoen Natie Group &middot; All rights reserved
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col bg-white">

        {/* Mobile header */}
        <div className="flex items-center gap-2 px-6 pt-8 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00205C] font-black text-[10px] text-[#FFB800]">
            KN
          </div>
          <p className="text-sm font-bold text-[#00205C]">KNS Logistics</p>
        </div>

        {/* Form body */}
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-8 py-12 sm:px-10">

          <div className="mb-8">
            <h2 className="text-2xl font-black tracking-tight text-[#00205C]">เข้าสู่ระบบ</h2>
            <p className="mt-1 text-sm text-gray-400">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                ชื่อผู้ใช้
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="username"
                required
                autoComplete="username"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 transition-all focus:border-[#00205C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00205C]/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-300 transition-all focus:border-[#00205C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00205C]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 transition-colors hover:text-gray-500"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !username || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00205C] py-3.5 text-sm font-bold text-white transition-all duration-150 hover:bg-[#003087] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <LogIn className="h-4 w-4" />
              }
              {isPending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {/* Role reference */}
          <div className="mt-8 border-t border-gray-100 pt-6">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-300">บัญชีตาม role</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                { role: 'Admin',      hint: 'ทุกสิทธิ์',    cls: 'bg-[#00205C]/10 text-[#00205C]' },
                { role: 'Driver',     hint: 'Employee ID', cls: 'bg-emerald-50 text-emerald-700' },
                { role: 'Manager',    hint: 'ภาพรวม',      cls: 'bg-purple-50 text-purple-700' },
                { role: 'Logistics',  hint: 'จัดส่ง-จอง', cls: 'bg-amber-50 text-amber-700' },
              ].map(r => (
                <div key={r.role} className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${r.cls}`}>{r.role}</span>
                  <span className="text-xs text-gray-400">{r.hint}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
