import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInDays, isAfter, isBefore, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy') {
  return format(typeof date === 'string' ? parseISO(date) : date, fmt);
}

export function isAdrValid(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  return isAfter(parseISO(expiryDate), new Date());
}

export function daysUntilAdrExpiry(expiryDate?: string): number | null {
  if (!expiryDate) return null;
  return differenceInDays(parseISO(expiryDate), new Date());
}

export function isDriverOnShift(
  shifts: { shift_date: string; shift_type: string }[],
  date: string
): boolean {
  const shift = shifts.find((s) => s.shift_date === date);
  return !!shift && shift.shift_type !== 'Off';
}

// CO2 savings calculation: Diesel emits ~2.68 kg CO2/L; avg truck consumes ~0.35 L/km
const DIESEL_CO2_PER_KM = 0.35 * 2.68; // ~0.938 kg CO2/km

export function calculateCO2Saved(distanceKm: number): number {
  return parseFloat((distanceKm * DIESEL_CO2_PER_KM).toFixed(2));
}

// EV battery range check — returns true if SOC is sufficient for the route
export function isEvSocSufficient(
  batterySoc: number,
  plannedKm: number,
  maxRangeKm = 300
): boolean {
  const availableRangeKm = (batterySoc / 100) * maxRangeKm;
  return availableRangeKm >= plannedKm * 1.15; // 15% buffer
}

export function getBatterySocColor(soc: number): string {
  if (soc >= 60) return 'text-green-600';
  if (soc >= 30) return 'text-yellow-600';
  return 'text-red-600';
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-700',
    Assigned: 'bg-blue-100 text-blue-700',
    Dispatched: 'bg-indigo-100 text-indigo-700',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Confirmed: 'bg-green-100 text-green-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    Incident: 'bg-red-100 text-red-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700';
}

export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    Info: 'bg-blue-50 border-blue-200 text-blue-800',
    Warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    Critical: 'bg-red-50 border-red-200 text-red-800',
  };
  return map[severity] ?? 'bg-gray-50 border-gray-200 text-gray-800';
}

export function routeCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    Subcontract: 'Sub-contract',
    BSM_STYROLUTION: 'BSM & STYROLUTION',
    Shuttle: 'Other Shuttles',
    Bulk: 'Bulk',
    Vanbox: 'Vanbox',
  };
  return map[category] ?? category;
}
