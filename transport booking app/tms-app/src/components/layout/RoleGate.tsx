'use client';

import { useRole, type AppRole } from '@/context/role';

const ROLES: { role: AppRole; icon: string; title: string; subtitle: string; color: string }[] = [
  {
    role: 'admin',
    icon: '📋',
    title: 'Admin',
    subtitle: 'จองรถและจัดการงานขนส่ง',
    color: 'border-blue-400 hover:bg-blue-50',
  },
  {
    role: 'driver',
    icon: '🚛',
    title: 'พนักงานขับรถ',
    subtitle: 'ดูตารางงานและเส้นทาง',
    color: 'border-emerald-400 hover:bg-emerald-50',
  },
  {
    role: 'manager',
    icon: '📊',
    title: 'ผู้จัดการระบบ',
    subtitle: 'ดูข้อมูลภาพรวมทั้งหมด',
    color: 'border-purple-400 hover:bg-purple-50',
  },
];

export function RoleGate({ children }: { children: React.ReactNode }) {
  const { role, setRole } = useRole();

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white text-2xl font-bold shadow-lg">
              TMS
            </div>
            <h1 className="text-2xl font-bold text-gray-900">KNS Transport</h1>
            <p className="mt-1 text-sm text-gray-500">เลือกบทบาทของคุณเพื่อเข้าใช้งาน</p>
          </div>

          <div className="space-y-3">
            {ROLES.map(({ role: r, icon, title, subtitle, color }) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition-all active:scale-98 ${color}`}
              >
                <span className="text-3xl">{icon}</span>
                <div>
                  <p className="font-bold text-gray-900">{title}</p>
                  <p className="text-sm text-gray-500">{subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
