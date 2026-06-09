import { PlanningBoard } from '@/components/planning/PlanningBoard';

export const metadata = { title: 'Dispatch Planning — KNS TMS' };

export default function PlanningPage() {
  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Dispatch Planning Board</h1>
        <p className="text-sm text-gray-500 mt-1">
          Assign drivers, vehicles, and assets. The system enforces ท.4 + ADR requirements and EV battery constraints automatically.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <PlanningBoard />
      </div>
    </div>
  );
}
