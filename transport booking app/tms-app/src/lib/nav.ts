import {
  LayoutDashboard, CalendarPlus, MapPin, Activity, Leaf,
  Truck, BarChart3, Package, ClipboardList, Settings2, Send, Fuel,
} from 'lucide-react';
import type { AppRole } from '@/context/role';

// Single source of truth for the post-login menu hub (MenuPage).
// Access lists mirror the route guards in App.tsx — keep them in sync.
export interface AppFunction {
  key: string;
  path: string;
  icon: React.ElementType;
  th: string;
  en: string;
  desc: string;
  roles: AppRole[];
  comingSoon?: boolean;
}

export const APP_FUNCTIONS: AppFunction[] = [
  {
    key: 'dashboard', path: '/dashboard', icon: LayoutDashboard,
    th: 'สถิติประจำวัน', en: 'Dashboard', desc: 'ภาพรวม KPI และงานประจำวัน',
    roles: ['admin', 'manager'],
  },
  {
    key: 'manager', path: '/manager', icon: BarChart3,
    th: 'ภาพรวมระบบ', en: 'Overview', desc: 'ข้อมูลรถ พขร. และงานแบบ real-time',
    roles: ['manager'],
  },
  {
    key: 'booking', path: '/booking', icon: CalendarPlus,
    th: 'จองรถขนส่ง', en: 'Booking', desc: 'สร้างและจัดการงานจอง',
    roles: ['admin', 'logistics', 'cs'],
  },
  {
    key: 'planning', path: '/planning', icon: MapPin,
    th: 'วางแผนงาน', en: 'Planning', desc: 'มอบหมายงานและวางเส้นทาง',
    roles: ['admin', 'manager', 'supervisor', 'planner'],
  },
  {
    key: 'tracking', path: '/tracking', icon: Activity,
    th: 'ติดตามรถ', en: 'Tracking', desc: 'ตำแหน่งและสถานะเที่ยววิ่ง',
    roles: ['admin', 'manager', 'supervisor'],
  },
  {
    key: 'sustainability', path: '/tracking/sustainability', icon: Leaf,
    th: 'CO₂ / EV', en: 'Sustainability', desc: 'การปล่อยคาร์บอนและกองรถ EV',
    roles: ['admin', 'manager'],
  },
  {
    key: 'driver', path: '/driver', icon: Truck,
    th: 'ตารางงานฉัน', en: 'My Shifts', desc: 'งานที่ได้รับมอบหมายและกล่องงาน',
    roles: ['driver'],
  },
  {
    key: 'fuel', path: '/fuel', icon: Fuel,
    th: 'เติมน้ำมัน', en: 'Fuel', desc: 'บันทึกเลขไมล์และสลิปการเติมน้ำมัน',
    roles: ['driver'],
  },
  {
    key: 'wms', path: '/wms/packout', icon: Package,
    th: 'คลังสินค้า', en: 'Warehouse', desc: 'แพ็กเอ้าท์และงานคลัง',
    roles: ['warehouse_op', 'supervisor', 'planner', 'admin'],
    comingSoon: true,
  },
  {
    key: 'wms-daily', path: '/wms/warehouse-daily', icon: ClipboardList,
    th: 'รายงานรายวัน', en: 'Daily Report', desc: 'สรุปงานคลังประจำวัน',
    roles: ['supervisor', 'admin'],
    comingSoon: true,
  },
  {
    key: 'wms-planning', path: '/wms/planning', icon: Settings2,
    th: 'วางแผน WMS', en: 'WMS Planning', desc: 'วางแผนรีแพ็กและมาสเตอร์ดาต้า',
    roles: ['planner', 'admin'],
    comingSoon: true,
  },
  {
    key: 'outbound', path: '/outbound/domestic', icon: Send,
    th: 'จัดส่ง / ออเดอร์', en: 'Outbound', desc: 'งานส่งออกและเอกสาร',
    roles: ['logistics', 'cs', 'admin'],
    comingSoon: true,
  },
];

export function functionsForRole(role: AppRole): AppFunction[] {
  return APP_FUNCTIONS.filter(fn => fn.roles.includes(role));
}
