import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowRight } from 'lucide-react';
import { useRole } from '@/context/role';
import { functionsForRole, type AppFunction } from '@/lib/nav';
import { signOutEverywhere } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export default function MenuPage() {
  const { role, displayName, driverName, isInitializing, clearRole } = useRole();
  const navigate = useNavigate();

  if (isInitializing) return null;
  if (!role) { navigate('/', { replace: true }); return null; }

  const functions = functionsForRole(role);
  const name = driverName ?? displayName;

  function open(fn: AppFunction) {
    if (fn.comingSoon) return;
    navigate(fn.path);
  }

  function handleLogout() {
    void signOutEverywhere();
    clearRole();
    navigate('/', { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#00205C]">
      <header className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFB800] text-sm font-black text-[#00205C] shadow-lg">
          KN
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-white">KNS Logistics</p>
          <p className="text-xs text-white/40">Transport Management System</p>
        </div>
        <button
          onClick={handleLogout}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" /> ออกจากระบบ
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-8">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#FFB800]/30 bg-[#FFB800]/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-[#FFB800]">ระบบพร้อมใช้งาน</span>
          </div>
          <h1 className="text-3xl font-black leading-tight text-white">
            สวัสดี{name ? ` ${name}` : ''}
          </h1>
          <p className="mt-2 text-sm text-white/50">เลือกเมนูที่ต้องการใช้งาน</p>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {functions.map((fn) => {
            const Icon = fn.icon;
            return (
              <button
                key={fn.key}
                onClick={() => open(fn)}
                disabled={fn.comingSoon}
                className={cn(
                  'group relative flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm transition-all duration-200',
                  fn.comingSoon
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:scale-[1.02] hover:border-[#FFB800]/40 hover:bg-white/10 hover:shadow-2xl active:scale-[0.99]'
                )}
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFB800] text-[#00205C] shadow-lg">
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">
                    {fn.en}
                  </span>
                </div>
                <h2 className="mb-1 text-lg font-black text-white">{fn.th}</h2>
                <p className="mb-5 text-sm leading-snug text-white/50">{fn.desc}</p>
                <div className="mt-auto flex items-center justify-between">
                  {fn.comingSoon ? (
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/40">
                      เร็วๆ นี้
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm font-bold text-[#FFB800]">
                      เข้าใช้งาน
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-white/30">
          KNS Transport · Hazardous Logistics &amp; EV Fleet Management
        </p>
      </main>
    </div>
  );
}
