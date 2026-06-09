import { Truck, CalendarDays, Activity, Leaf, AlertTriangle, Zap } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';

export const metadata = { title: 'Dashboard — KNS TMS' };

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Today&apos;s overview —{' '}
          {new Date().toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Trips" value="—" sub="Dispatched today" icon={<Truck className="h-5 w-5" />} color="blue" />
        <StatCard label="Pending Bookings" value="—" sub="Awaiting assignment" icon={<CalendarDays className="h-5 w-5" />} color="amber" />
        <StatCard label="Live Alerts" value="—" sub="Unacknowledged events" icon={<AlertTriangle className="h-5 w-5" />} color="red" />
        <StatCard label="CO₂ Saved (MTD)" value="—" sub="vs diesel baseline" icon={<Leaf className="h-5 w-5" />} color="green" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card hover className="p-5">
          <a href="/booking" className="block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Create Booking</p>
                <p className="text-xs text-gray-500">Submit a new transport request</p>
              </div>
            </div>
          </a>
        </Card>
        <Card hover className="p-5">
          <a href="/planning" className="block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Dispatch Planning</p>
                <p className="text-xs text-gray-500">Assign drivers, vehicles &amp; assets</p>
              </div>
            </div>
          </a>
        </Card>
        <Card hover className="p-5">
          <a href="/tracking" className="block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Live Tracking</p>
                <p className="text-xs text-gray-500">Monitor trips &amp; telematics events</p>
              </div>
            </div>
          </a>
        </Card>
      </div>
    </div>
  );
}
