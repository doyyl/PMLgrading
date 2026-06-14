import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, CalendarPlus, MapPin, Activity,
  Leaf, ChevronLeft, ChevronRight, Truck, BarChart3, LogOut,
  Package, ClipboardList, Settings2, Send, Headphones,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole, type AppRole } from '@/context/role';
import { signOutEverywhere } from '@/hooks/useAuth';

type NavItem = { href: string; icon: React.ElementType; th: string; en: string };

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  admin: [
    { href: '/dashboard', icon: LayoutDashboard, th: 'สถิติ',       en: 'Statistics' },
    { href: '/booking',   icon: CalendarPlus,    th: 'จองรถ',       en: 'Booking' },
    { href: '/planning',  icon: MapPin,           th: 'วางแผนงาน',  en: 'Planning' },
    { href: '/tracking',  icon: Activity,         th: 'ติดตามรถ',   en: 'Tracking' },
  ],
  driver: [
    { href: '/driver',    icon: Truck,           th: 'ตารางงานฉัน', en: 'My Shifts' },
  ],
  manager: [
    { href: '/manager',   icon: BarChart3,       th: 'ภาพรวมระบบ',  en: 'Overview' },
    { href: '/dashboard', icon: LayoutDashboard, th: 'สถิติ',       en: 'Statistics' },
    { href: '/planning',  icon: MapPin,           th: 'วางแผนงาน',  en: 'Planning' },
    { href: '/tracking',  icon: Activity,         th: 'ติดตามรถ',   en: 'Tracking' },
    { href: '/tracking/sustainability', icon: Leaf, th: 'CO₂ / EV', en: 'Sustainability' },
  ],
  warehouse_op: [
    { href: '/wms/packout',         icon: Package,       th: 'แพ็กเอ้าท์',  en: 'Packout' },
  ],
  supervisor: [
    { href: '/wms/warehouse-daily', icon: ClipboardList, th: 'รายงานรายวัน', en: 'Daily Report' },
    { href: '/wms/packout',         icon: Package,       th: 'แพ็กเอ้าท์',  en: 'Packout' },
  ],
  planner: [
    { href: '/wms/planning',        icon: Settings2,     th: 'วางแผน WMS',   en: 'WMS Planning' },
  ],
  logistics: [
    { href: '/outbound/domestic',   icon: Send,          th: 'จัดส่ง',       en: 'Outbound' },
    { href: '/booking',             icon: CalendarPlus,  th: 'จองรถ',        en: 'Booking' },
  ],
  cs: [
    { href: '/booking',             icon: CalendarPlus,  th: 'จองรถ',        en: 'Booking' },
    { href: '/outbound/domestic',   icon: Headphones,    th: 'ออเดอร์',      en: 'Orders' },
  ],
};

const ROLE_LABEL: Record<AppRole, string> = {
  admin:         'Admin',
  driver:        'พนักงานขับรถ',
  manager:       'ผู้จัดการระบบ',
  warehouse_op:  'Warehouse OP',
  supervisor:    'Supervisor',
  planner:       'Planner',
  logistics:     'Logistics',
  cs:            'Customer Service',
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { role, driverName, clearRole } = useRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const nav = role ? NAV_BY_ROLE[role] : NAV_BY_ROLE.admin;
  const roleLabel = role ? ROLE_LABEL[role] : null;

  function handleLogout() {
    void signOutEverywhere();
    clearRole();
    navigate('/', { replace: true });
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center gap-3 border-b border-[#001840] bg-[#00205C] px-4 py-3 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFB800] font-black text-[10px] text-[#00205C]">
          KN
        </div>
        <p className="text-sm font-bold text-white">KNS Transport</p>
        <div className="ml-auto flex items-center gap-1">
          {nav.map(({ href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  'flex flex-col items-center rounded-lg p-1.5 transition-colors',
                  active ? 'text-[#FFB800]' : 'text-white/50 hover:text-white/80'
                )}
              >
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="ml-1 rounded-lg p-1.5 text-white/30 transition-colors hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden md:flex h-screen flex-col bg-[#00205C] border-r border-[#001840] transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}>
        {/* Logo */}
        <div className={cn(
          'flex items-center border-b border-white/[0.06] px-4 py-4',
          collapsed ? 'justify-center' : 'gap-3'
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFB800] font-black text-sm text-[#00205C]">
            KN
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold leading-tight text-white">KNS Logistics</p>
              <p className="text-xs text-white/30">Transport</p>
            </div>
          )}
        </div>

        {/* Role badge */}
        {!collapsed && roleLabel && (
          <div className="px-3 pt-3 pb-1">
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#FFB800]/15 px-3 py-1">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFB800]" />
              <span className="truncate text-xs font-semibold text-[#FFB800]">
                {roleLabel}{driverName ? ` · ${driverName}` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {nav.map(({ href, icon: Icon, th, en }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                to={href}
                title={collapsed ? `${th} (${en})` : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'border-l-2 border-[#FFB800] bg-white/[0.08] pl-2.5 text-[#FFB800]'
                    : 'border-l-2 border-transparent text-white/55 hover:bg-white/[0.05] hover:text-white/90',
                  collapsed && 'justify-center border-l-0 px-2 pl-2'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="truncate leading-tight">{th}</p>
                    <p className={cn(
                      'truncate text-[11px] leading-tight',
                      active ? 'text-[#FFB800]/60' : 'text-white/25'
                    )}>
                      {en}
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 border-t border-white/[0.06] px-4 py-3 text-xs text-white/30 transition-colors hover:bg-white/[0.05] hover:text-red-400',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>ออกจากระบบ</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2 border-t border-white/[0.06] px-4 py-3 text-xs text-white/20 transition-colors hover:bg-white/[0.05] hover:text-white/50',
            collapsed ? 'justify-center' : ''
          )}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <><ChevronLeft className="h-4 w-4" /><span>ย่อเมนู</span></>
          }
        </button>
      </aside>
    </>
  );
}
