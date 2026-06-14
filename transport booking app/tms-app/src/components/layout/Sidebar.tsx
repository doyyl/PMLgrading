

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

const ROLE_LABEL: Record<AppRole, { label: string; color: string }> = {
  admin:         { label: 'Admin',           color: 'bg-blue-100 text-blue-700' },
  driver:        { label: 'พนักงานขับรถ',    color: 'bg-emerald-100 text-emerald-700' },
  manager:       { label: 'ผู้จัดการระบบ',    color: 'bg-purple-100 text-purple-700' },
  warehouse_op:  { label: 'Warehouse OP',    color: 'bg-orange-100 text-orange-700' },
  supervisor:    { label: 'Supervisor',      color: 'bg-amber-100 text-amber-700' },
  planner:       { label: 'Planner',         color: 'bg-teal-100 text-teal-700' },
  logistics:     { label: 'Logistics',       color: 'bg-indigo-100 text-indigo-700' },
  cs:            { label: 'Customer Service', color: 'bg-pink-100 text-pink-700' },
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { role, driverName, clearRole } = useRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const nav = role ? NAV_BY_ROLE[role] : NAV_BY_ROLE.admin;
  const roleInfo = role ? ROLE_LABEL[role] : null;

  function handleLogout() {
    void signOutEverywhere(); // end the Supabase Auth session too
    clearRole();
    navigate('/', { replace: true });
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">TMS</div>
        <p className="font-bold text-gray-900 text-sm">KNS Transport</p>
        <div className="ml-auto flex gap-1 items-center">
          {nav.map(({ href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} to={href}
                className={cn('flex flex-col items-center rounded-lg p-1.5 text-[10px] font-medium transition-colors',
                  active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50')}>
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
          <button onClick={handleLogout} className="ml-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-50">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden md:flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}>
        {/* Logo */}
        <div className={cn('flex items-center border-b border-gray-100 px-4 py-4',
          collapsed ? 'justify-center' : 'gap-3')}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm">
            TMS
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">KNS Logistics</p>
              <p className="text-xs text-gray-400">Transport</p>
            </div>
          )}
        </div>

        {/* Role badge */}
        {!collapsed && roleInfo && (
          <div className="px-4 pt-3 pb-1">
            <div className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', roleInfo.color)}>
              {roleInfo.label}
              {driverName && <span className="opacity-70">· {driverName}</span>}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {nav.map(({ href, icon: Icon, th, en }) => {
            const active = pathname === href;
            return (
              <Link key={href} to={href}
                title={collapsed ? `${th} (${en})` : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
                  collapsed && 'justify-center px-2'
                )}>
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <div>
                    <p className="leading-tight">{th}</p>
                    <p className={cn('text-xs leading-tight', active ? 'text-blue-200' : 'text-gray-400')}>{en}</p>
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
            'flex items-center gap-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-colors',
            collapsed && 'justify-center'
          )}>
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>ออกจากระบบ</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center gap-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <><ChevronLeft className="h-4 w-4" /><span>ย่อเมนู</span></>}
        </button>
      </aside>
    </>
  );
}
