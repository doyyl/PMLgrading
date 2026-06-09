// Master reference data extracted from Transport_Daily Plan Excel file
// Used across all booking forms, planning board, and filtering dropdowns

export const SITES = [
  'MDC',
  'MDCII',
  'MDCSE',
  'TPLC',
  'AVT On-Site',
  'COV On-site',
  'IPI On-Site',
] as const;

export const CUSTOMERS = [
  'AVT',
  'AVTSAKURA',
  'BEE',
  'BMSCPD',
  'BMSCPDRM',
  'DOWSE',
  'HMC',
  'IPI',
  'MAKROFOL',
  'SOLVAY',
  'SOLVAYTHAI',
  'STYROLUTION',
] as const;

export const TRUCK_TYPES = [
  { value: "Dock loading (ตู้ทึบเปิดท้าย)", label: "Dock loading (ตู้ทึบเปิดท้าย)", category: 'Shuttle' as const },
  { value: "Side Loading (รถพ่วงเปิดข้าง)",  label: "Side Loading (รถพ่วงเปิดข้าง)",  category: 'Shuttle' as const },
  { value: "Side Loading (รถผ้าใบเปิดข้าง)", label: "Side Loading (รถผ้าใบเปิดข้าง)", category: 'Shuttle' as const },
  { value: "Bulk Truck",                      label: "Bulk Truck",                       category: 'Bulk'    as const },
  { value: "40' HQ",                          label: "40' HQ Container",                 category: 'Vanbox'  as const },
  { value: "รถ 3 เพลา",                       label: "รถ 3 เพลา (10-Wheel)",             category: 'Bulk'    as const },
] as const;

export const ACTIVITIES = [
  'Transfer',
  'Internal Move',
  'Bulk Truck',
  'Bulk Transfer',
] as const;

export const LOADING_PLACES = [
  'MDC',
  'MDCII',
  'MDCSE',
  'TPLC',
  'BEE',
  'BMSCPD',
  'HMC',
  'IPI',
  'IPIBICO',
  'IPICHIP',
  'MAKROFOL',
  'SOLVAY',
  'SOLVAYTHAI',
  'STYROLUTION',
  'AVT',
  'AVTSAKURA',
] as const;

export const DELIVERY_PLACES = [
  'MDC',
  'MDC1586',
  'MDC1810',
  'MDCII',
  'MDCSE',
  'TPLC',
  'BEE',
  'BMSCPD',
  'BMSBPA',
  'MAKROFOL',
  'SOLVAY',
  'SOLVAYTHAI',
  'STYROLUTION',
  'Vexcel',
  'OPM',
  'COV On-site',
  'AVT',
  'AVTSAKURA',
] as const;

export const SHIFTS = ['DAY', 'NIGHT'] as const;

export const CSR_CONTACTS = [
  'Jirawan/3324',
  'Kwanchanok/3284',
  'Rungtawan/3297',
  'suvanee/3340',
  'suwanna/3218',
  'SASITHON 3305',
  'Nitinai/3226',
  'Teeranese/0983365011',
  'Wandee/0634740968',
  'Amonrat/3225',
  'CHANAKAN/3233',
  'Supaporn/3280',
  'SUJITJAI /3316',
  'PORN/3234',
  'Kunniga/3279',
] as const;

// Route category mapping from truck type
export function routeCategoryFromTruckType(truckType: string): string {
  const found = TRUCK_TYPES.find(t => t.value === truckType);
  return found?.category ?? 'Shuttle';
}

// Common route pairs derived from historical data
export const COMMON_ROUTES: Array<{ loading: string; delivery: string; customer: string; truck_type: string }> = [
  { loading: 'BEE',       delivery: 'MDC',       customer: 'BEE',        truck_type: "Side Loading (รถพ่วงเปิดข้าง)" },
  { loading: 'SOLVAY',    delivery: 'MDC',        customer: 'SOLVAY',     truck_type: "Dock loading (ตู้ทึบเปิดท้าย)" },
  { loading: 'MDC',       delivery: 'SOLVAY',     customer: 'SOLVAYTHAI', truck_type: "Side Loading (รถพ่วงเปิดข้าง)" },
  { loading: 'MAKROFOL',  delivery: 'MDCII',      customer: 'MAKROFOL',   truck_type: "Dock loading (ตู้ทึบเปิดท้าย)" },
  { loading: 'MDCII',     delivery: 'MAKROFOL',   customer: 'MAKROFOL',   truck_type: "Side Loading (รถพ่วงเปิดข้าง)" },
  { loading: 'BMSCPD',    delivery: 'TPLC',       customer: 'BMSCPD',     truck_type: "Dock loading (ตู้ทึบเปิดท้าย)" },
  { loading: 'BMSCPD',    delivery: 'MDCII',      customer: 'BMSCPD',     truck_type: "Dock loading (ตู้ทึบเปิดท้าย)" },
  { loading: 'HMC',       delivery: 'MDCII',      customer: 'HMC',        truck_type: "Side Loading (รถพ่วงเปิดข้าง)" },
  { loading: 'AVT',       delivery: 'MDCII',      customer: 'AVT',        truck_type: "40' HQ" },
  { loading: 'AVTSAKURA', delivery: 'MDCII',      customer: 'AVTSAKURA',  truck_type: "40' HQ" },
  { loading: 'IPIBICO',   delivery: 'MDC1810',    customer: 'IPI',        truck_type: "Dock loading (ตู้ทึบเปิดท้าย)" },
  { loading: 'STYROLUTION',delivery: 'MDC',       customer: 'STYROLUTION',truck_type: "Dock loading (ตู้ทึบเปิดท้าย)" },
  { loading: 'MDCSE',     delivery: 'MDC1586',    customer: 'DOWSE',      truck_type: "Dock loading (ตู้ทึบเปิดท้าย)" },
];
