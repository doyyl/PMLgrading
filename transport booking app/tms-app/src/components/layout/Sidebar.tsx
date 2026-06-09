'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, CalendarPlus, MapPin, Activity,
  Leaf, ChevronLeft, ChevronRight, Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/',                         icon: LayoutDashboard, th: 'หน้าหลัก',      en: 'Dashboard' },
  { href: '/booking',                  icon: CalendarPlus,    th: 'จองรถ',          en: 'Booking' },
  { href: '/planning',                 icon: MapPin,          th: 'วางแผนงาน',      en: 'Planning' },
  { href: '/tracking',                 icon: Activity,        th: 'ติดตามรถ',       en: 'Tracking' },
  { href: '/tracking/sustainability',  icon: Leaf,            th: 'CO₂ / EV',       en: 'Sustainability' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">TMS</div>
        <p className="font-bold text-gray-900 text-sm">KNS Transport</p>
        <div className="ml-auto flex gap-1">
          {NAV.map(({ href, icon: Icon, th }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={cn('flex flex-col items-center rounded-lg p-1.5 text-[10px] font-medium transition-colors',
                  active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50')}>
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {NAV.map(({ href, icon: Icon, th, en }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
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
