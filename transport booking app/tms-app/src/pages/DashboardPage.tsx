import { useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useDashboardStats, formatDuration, type DashboardStats } from '@/hooks/useStats';
import { cn } from '@/lib/utils';
import {
  Truck, CheckCircle2, XCircle, Timer, Users, CalendarDays,
  TrendingUp, MapPin, Trophy,
} from 'lucide-react';

const STATUS_META = [
  { key: 'completed',   label: 'เสร็จแล้ว',   color: '#10b981' },
  { key: 'in_progress', label: 'กำลังวิ่ง',   color: '#f59e0b' },
  { key: 'assigned',    label: 'มอบหมายแล้ว', color: '#3b82f6' },
  { key: 'unassigned',  label: 'รอมอบหมาย',  color: '#9ca3af' },
  { key: 'cancelled',   label: 'ยกเลิก',      color: '#ef4444' },
] as const;

const RANGES = [
  { days: 7,  label: '7 วัน' },
  { days: 14, label: '14 วัน' },
  { days: 30, label: '30 วัน' },
] as const;

// ── KPI card ──────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className={cn('mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl', color)}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1.5 font-medium">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────

function Section({ title, icon, children, className }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-gray-100 bg-white p-5 shadow-sm', className)}>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────────

function TripsPerDayChart({ stats }: { stats: DashboardStats }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={stats.days} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
          formatter={(value, name) => [value ?? 0, STATUS_META.find(s => s.key === name)?.label ?? String(name)]}
        />
        <Legend
          formatter={(value: string) => (
            <span style={{ fontSize: 11, color: '#6b7280' }}>
              {STATUS_META.find(s => s.key === value)?.label ?? value}
            </span>
          )}
        />
        {STATUS_META.map(s => (
          <Bar key={s.key} dataKey={s.key} stackId="trips" fill={s.color} radius={s.key === 'completed' ? [0, 0, 0, 0] : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function StatusDonut({ stats }: { stats: DashboardStats }) {
  const data = STATUS_META
    .map(s => ({ name: s.label, value: stats.statusTotals[s.key], color: s.color }))
    .filter(d => d.value > 0);

  if (data.length === 0) {
    return <p className="py-16 text-center text-sm text-gray-400">ยังไม่มีข้อมูล</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map(d => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
        <Legend formatter={(v: string) => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Ranked progress list (customers / routes) ────────────────

function RankList({ items }: { items: { label: string; value: number; sub?: string }[] }) {
  if (items.length === 0) return <p className="py-8 text-center text-sm text-gray-400">ยังไม่มีข้อมูล</p>;
  const max = Math.max(...items.map(i => i.value));
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-gray-700 truncate flex items-center gap-1.5">
              <span className={cn(
                'inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold shrink-0',
                i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
              )}>{i + 1}</span>
              {item.label}
            </span>
            <span className="font-bold text-gray-900 shrink-0 ml-2">
              {item.value} <span className="font-normal text-gray-400">เที่ยว{item.sub ? ` · ${item.sub}` : ''}</span>
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Driver leaderboard ────────────────────────────────────────

function DriverLeaderboard({ stats }: { stats: DashboardStats }) {
  if (stats.drivers.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">ยังไม่มีข้อมูลพนักงาน</p>;
  }
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-2 text-left text-[11px] font-bold text-gray-400 uppercase">พนักงาน</th>
            <th className="py-2 text-center text-[11px] font-bold text-gray-400 uppercase">รวม</th>
            <th className="py-2 text-center text-[11px] font-bold text-gray-400 uppercase">เสร็จ</th>
            <th className="py-2 text-center text-[11px] font-bold text-gray-400 uppercase">อัตราสำเร็จ</th>
            <th className="py-2 text-right text-[11px] font-bold text-gray-400 uppercase">เวลาเฉลี่ย/เที่ยว</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {stats.drivers.map((d, i) => (
            <tr key={d.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-2.5 font-medium text-gray-900">
                <span className="flex items-center gap-2">
                  {i < 3 && <Trophy className={cn('h-3.5 w-3.5', i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : 'text-amber-700/50')} />}
                  {d.name}
                </span>
              </td>
              <td className="py-2.5 text-center text-gray-600">{d.total}</td>
              <td className="py-2.5 text-center font-semibold text-emerald-600">{d.completed}</td>
              <td className="py-2.5">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-1.5 w-14 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', d.completionRate >= 80 ? 'bg-emerald-500' : d.completionRate >= 50 ? 'bg-amber-400' : 'bg-gray-300')}
                      style={{ width: `${d.completionRate}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8">{d.completionRate}%</span>
                </div>
              </td>
              <td className="py-2.5 text-right text-xs text-gray-500">{formatDuration(d.avgMinutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function DashboardPage() {
  const [range, setRange] = useState<number>(14);
  const { data: stats, isLoading } = useDashboardStats(range);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">สถิติการขนส่ง</h1>
          <p className="text-sm text-gray-500">ภาพรวมประสิทธิภาพย้อนหลัง {range} วัน</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map(r => (
            <button key={r.days} onClick={() => setRange(r.days)}
              className={cn(
                'rounded-xl px-4 py-2 text-xs font-semibold transition-colors',
                range === r.days ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !stats ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
          <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon={<Truck className="h-4 w-4 text-blue-600" />} color="bg-blue-50"
              label="เที่ยวทั้งหมด" value={stats.kpi.totalTrips} />
            <KpiCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} color="bg-emerald-50"
              label="เสร็จแล้ว" value={stats.kpi.completed} />
            <KpiCard icon={<TrendingUp className="h-4 w-4 text-indigo-600" />} color="bg-indigo-50"
              label="อัตราสำเร็จ" value={`${stats.kpi.completionRate}%`} />
            <KpiCard icon={<Timer className="h-4 w-4 text-amber-600" />} color="bg-amber-50"
              label="เวลาเฉลี่ย/เที่ยว" value={formatDuration(stats.kpi.avgMinutes)} />
            <KpiCard icon={<Users className="h-4 w-4 text-purple-600" />} color="bg-purple-50"
              label="พนักงานที่วิ่งงาน" value={stats.kpi.activeDrivers} />
            <KpiCard icon={<XCircle className="h-4 w-4 text-red-500" />} color="bg-red-50"
              label="ยกเลิก" value={stats.kpi.cancelled}
              sub={`คำจองรอยืนยัน ${stats.kpi.pendingBookings}`} />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Section title="จำนวนเที่ยวต่อวัน" icon={<CalendarDays className="h-4 w-4 text-blue-500" />} className="lg:col-span-2">
              <TripsPerDayChart stats={stats} />
            </Section>
            <Section title="สัดส่วนสถานะงาน" icon={<Truck className="h-4 w-4 text-amber-500" />}>
              <StatusDonut stats={stats} />
            </Section>
          </div>

          {/* Customers + Routes */}
          <div className="grid md:grid-cols-2 gap-4">
            <Section title="ลูกค้าที่ใช้บริการมากที่สุด" icon={<Users className="h-4 w-4 text-indigo-500" />}>
              <RankList items={stats.customers.map(c => ({
                label: c.customer, value: c.total, sub: `เสร็จ ${c.completed}`,
              }))} />
            </Section>
            <Section title="เส้นทางยอดนิยม" icon={<MapPin className="h-4 w-4 text-emerald-500" />}>
              <RankList items={stats.routes.map(r => ({ label: r.route, value: r.count }))} />
            </Section>
          </div>

          {/* Driver leaderboard */}
          <Section title="ผลงานพนักงานขับรถ" icon={<Trophy className="h-4 w-4 text-amber-500" />}>
            <DriverLeaderboard stats={stats} />
          </Section>
        </>
      )}
    </div>
  );
}
