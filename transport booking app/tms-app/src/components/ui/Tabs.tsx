

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Tab {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (value: string) => void;
  children?: ReactNode;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            active === tab.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {tab.label}
          {tab.count != null && (
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-xs',
              active === tab.value ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
