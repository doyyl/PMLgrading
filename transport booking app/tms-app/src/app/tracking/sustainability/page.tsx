import { SustainabilityChart } from '@/components/tracking/SustainabilityChart';

export const metadata = { title: 'Sustainability — KNS TMS' };

export default function SustainabilityPage() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sustainability & Scope 3 Emissions</h1>
        <p className="text-sm text-gray-500 mt-1">
          CO₂ reduction tracking for EV fleet vs diesel baseline. All figures are Scope 3 estimates using IPCC emission factors.
        </p>
      </div>
      <SustainabilityChart />
    </div>
  );
}
