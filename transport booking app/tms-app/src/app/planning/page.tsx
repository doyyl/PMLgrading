import { PlanningBoard } from '@/components/planning/PlanningBoard';

export const metadata = { title: 'วางแผนงาน — KNS TMS' };

export default function PlanningPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
        <h1 className="text-lg font-bold text-gray-900">วางแผนงาน / Dispatch</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          มอบหมาย พขร. และรถ — ระบบตรวจ ท.4, ADR และ SOC รถ EV อัตโนมัติ
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <PlanningBoard />
      </div>
    </div>
  );
}
