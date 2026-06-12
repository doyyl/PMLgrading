

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole, type AppRole } from '@/context/role';

interface RoleConfig {
  role: AppRole;
  icon: string;
  title: string;
  titleEn: string;
  subtitle: string;
  features: string[];
  redirect: string;
  gradient: string;
  iconBg: string;
  badge: string;
}

const ROLES: RoleConfig[] = [
  {
    role: 'admin',
    icon: '📋',
    title: 'Admin',
    titleEn: 'Dispatcher',
    subtitle: 'จัดการงานจองและวางแผนขนส่ง',
    features: ['จองรถขนส่ง', 'วางแผนมอบหมายงาน', 'ดู dashboard ประจำวัน'],
    redirect: '/booking',
    gradient: 'from-blue-500 to-blue-700',
    iconBg: 'bg-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    role: 'driver',
    icon: '🚛',
    title: 'พนักงานขับรถ',
    titleEn: 'Driver',
    subtitle: 'ดูตารางกะและงานที่ได้รับมอบหมาย',
    features: ['ตารางกะงานรายสัปดาห์', 'งานวันนี้และที่จะมาถึง', 'รายละเอียดเส้นทาง'],
    redirect: '/driver',
    gradient: 'from-emerald-500 to-emerald-700',
    iconBg: 'bg-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    role: 'manager',
    icon: '📊',
    title: 'ผู้จัดการระบบ',
    titleEn: 'System Manager',
    subtitle: 'ภาพรวมข้อมูลทั้งหมดแบบ real-time',
    features: ['สถิติและ KPI ประจำวัน', 'ข้อมูลรถ พขร. และงาน', 'ติดตามและรายงาน'],
    redirect: '/manager',
    gradient: 'from-purple-500 to-purple-700',
    iconBg: 'bg-purple-600',
    badge: 'bg-purple-100 text-purple-700',
  },
];

export default function LandingPage() {
  const { clearRole, setRole } = useRole();
  const router = useRouter();

  // เคลียร์ role เก่าทุกครั้งที่เปิดหน้านี้
  useEffect(() => {
    clearRole();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(cfg: RoleConfig) {
    setRole(cfg.role);
    router.push(cfg.redirect);
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white font-black text-sm shadow-lg shadow-blue-500/30">
          TMS
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">KNS Logistics</p>
          <p className="text-blue-300 text-xs">Transport Management System</p>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        {/* Headline */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-blue-300">ระบบพร้อมใช้งาน</span>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight">เข้าสู่ระบบ</h1>
          <p className="mt-2 text-blue-300 text-sm">เลือกบทบาทของคุณเพื่อเริ่มใช้งาน</p>
        </div>

        {/* Role cards */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROLES.map((cfg) => (
            <button
              key={cfg.role}
              onClick={() => handleSelect(cfg)}
              className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.99] focus:outline-none"
            >
              {/* Role badge */}
              <div className="mb-5 flex items-center justify-between">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${cfg.iconBg} text-3xl shadow-lg`}>
                  {cfg.icon}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${cfg.badge}`}>
                  {cfg.titleEn}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-lg font-black text-white mb-1">{cfg.title}</h2>
              <p className="text-sm text-blue-200 mb-5 leading-snug">{cfg.subtitle}</p>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {cfg.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className={`mt-auto flex items-center justify-between rounded-xl bg-gradient-to-r ${cfg.gradient} px-4 py-3`}>
                <span className="text-sm font-bold text-white">เข้าใช้งาน</span>
                <span className="text-white text-lg">→</span>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-10 text-xs text-slate-500 text-center">
          KNS Transport · Hazardous Logistics &amp; EV Fleet Management
        </p>
      </main>
    </div>
  );
}
