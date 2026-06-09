import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'indigo';
  className?: string;
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
};

export function StatCard({ label, value, sub, icon, color = 'blue', className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border bg-white p-5 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        {icon && (
          <div className={cn('rounded-xl border p-3', colorMap[color])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
