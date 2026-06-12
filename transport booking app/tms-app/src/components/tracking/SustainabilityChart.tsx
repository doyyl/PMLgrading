

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Leaf } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useSustainability } from '@/hooks/useTracking';
import { StatCard } from '@/components/ui/StatCard';

export function SustainabilityChart() {
  const { data: months = [], isLoading } = useSustainability();

  const totalCo2Tonnes = months.reduce((s, m) => s + (m.total_co2_saved_tonnes ?? 0), 0);
  const totalEvTrips = months.reduce((s, m) => s + (m.ev_trips ?? 0), 0);
  const totalEvKm = months.reduce((s, m) => s + (m.ev_km ?? 0), 0);

  const chartData = months.map((m) => ({
    month: format(parseISO(m.month + '-01'), 'MMM yy'),
    'EV Trips': m.ev_trips,
    'Diesel Trips': m.diesel_trips,
    'CO₂ Saved (kg)': Math.round(m.total_co2_saved_kg),
  }));

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total CO₂ Saved"
          value={`${totalCo2Tonnes.toFixed(2)} t`}
          sub="Scope 3 — vs diesel baseline"
          icon={<Leaf className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="EV Trips Completed"
          value={totalEvTrips}
          sub="All time"
          color="blue"
        />
        <StatCard
          label="EV Distance Covered"
          value={`${Math.round(totalEvKm).toLocaleString()} km`}
          sub="Zero-emission km"
          color="indigo"
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">Monthly EV vs Diesel Trips & CO₂ Savings</h3>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading chart data…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
                <Bar yAxisId="left" dataKey="EV Trips" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="Diesel Trips" fill="#d1d5db" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="CO₂ Saved (kg)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
