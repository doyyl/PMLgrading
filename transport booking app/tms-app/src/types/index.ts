// ─── Enums ───────────────────────────────────────────────────
export type LicenseType = 'ท.3' | 'ท.4';
export type DriverCategory = 'Shuttle' | 'Bulk';
export type VehicleType = 'Shuttle' | 'Bulk' | 'Vanbox';
export type OwnershipType = 'KNS' | 'Subcontract';
export type PowertrainType = 'Diesel' | 'EV';
export type AssetStatus = 'Empty' | 'Loaded' | 'In Transit';
export type BookingStatus = 'Pending' | 'Confirmed' | 'Cancelled';
export type PlanStatus = 'Draft' | 'Assigned' | 'Dispatched' | 'Completed' | 'Cancelled';
export type TripStatus = 'Pending' | 'In Progress' | 'Completed' | 'Incident';
export type ShiftType = 'Day' | 'Night' | 'Off';
export type RouteCategory = 'Subcontract' | 'BSM_STYROLUTION' | 'Shuttle' | 'Bulk' | 'Vanbox';
export type CargoType = 'General' | 'Hazardous' | 'Chemical' | 'BPA' | 'ISO_Tank';
export type TelematicsEvent =
  | 'Harsh Braking'
  | 'Harsh Acceleration'
  | 'Speeding'
  | 'Fatigue Alert'
  | 'AI Camera Alert'
  | 'Start Prevent'
  | 'Geofence Entry'
  | 'Geofence Exit'
  | 'Engine On'
  | 'Engine Off';

export type EventSeverity = 'Info' | 'Warning' | 'Critical';

// ─── Domain Models ────────────────────────────────────────────
export interface Site {
  id: string;
  site_name: string;
  country: string;
  loading_location?: string;
  is_bpa_site: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
  contact_name?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  employee_id?: string;
  name: string;
  license_type: LicenseType;
  driver_category: DriverCategory;
  phone?: string;
  email?: string;
  active: boolean;
  adr_certificate_expiry?: string; // ISO date string
  license_expiry?: string;
  photo_url?: string;
  home_base_site_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: VehicleType;
  ownership: OwnershipType;
  powertrain: PowertrainType;
  battery_soc?: number;      // 0-100 for EV
  range_km?: number;
  max_payload_kg?: number;
  active: boolean;
  gps_device_id?: string;
  base_site_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  asset_id: string;           // e.g. "ISO-TANK-001"
  asset_type: string;
  status: AssetStatus;
  last_known_location?: string;
  site_id?: string;
  latitude?: number;
  longitude?: number;
  capacity_liters?: number;
  tare_weight_kg?: number;
  last_updated_at: string;
  created_at: string;
  // joined
  site?: Site;
}

export interface Booking {
  id: string;
  booking_ref: string;
  requested_date: string;
  site_id: string;
  vehicle_type: VehicleType;
  cargo_type: CargoType;
  is_bpa_cargo: boolean;
  quantity?: number;
  unit?: string;
  notes?: string;
  status: BookingStatus;
  requested_by?: string;
  route_category?: RouteCategory;
  origin_site_id?: string;
  dest_site_id?: string;
  created_at: string;
  updated_at: string;
  // joined
  site?: Site;
}

export interface DriverShift {
  id: string;
  driver_id: string;
  shift_date: string;
  shift_type: ShiftType;
  start_time?: string;
  end_time?: string;
  notes?: string;
  created_at: string;
}

export interface DailyPlan {
  id: string;
  plan_date: string;
  booking_id: string;
  driver_id?: string;
  vehicle_id?: string;
  asset_id?: string;
  route_category: RouteCategory;
  status: PlanStatus;
  planned_distance_km?: number;
  estimated_co2_saved?: number;
  dispatch_notes?: string;
  dispatched_at?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // joined
  booking?: Booking;
  driver?: Driver;
  vehicle?: Vehicle;
  asset?: Asset;
}

export interface PlanningBoardRow {
  id: string;
  plan_date: string;
  route_category: RouteCategory;
  status: PlanStatus;
  planned_distance_km?: number;
  estimated_co2_saved?: number;
  dispatch_notes?: string;
  booking_ref: string;
  cargo_type: CargoType;
  is_bpa_cargo: boolean;
  quantity?: number;
  unit?: string;
  site_name: string;
  is_bpa_site: boolean;
  driver_name?: string;
  driver_license?: LicenseType;
  adr_certificate_expiry?: string;
  plate_number?: string;
  vehicle_type?: VehicleType;
  powertrain?: PowertrainType;
  battery_soc?: number;
  asset_id?: string;
  asset_status?: AssetStatus;
  last_known_location?: string;
}

export interface TrackingPoint {
  id: string;
  plan_id: string;
  trip_status: TripStatus;
  latitude?: number;
  longitude?: number;
  speed_kmh?: number;
  heading?: number;
  altitude_m?: number;
  platform_source: string;
  event_type?: TelematicsEvent;
  event_detail?: Record<string, unknown>;
  recorded_at: string;
  created_at: string;
}

export interface TripEvent {
  id: string;
  plan_id: string;
  event_type: TelematicsEvent;
  severity: EventSeverity;
  latitude?: number;
  longitude?: number;
  speed_kmh?: number;
  description?: string;
  media_url?: string;
  acknowledged: boolean;
  ack_by?: string;
  ack_at?: string;
  recorded_at: string;
}

export interface JobAcceptance {
  id: string;
  plan_id: string;
  driver_id: string;
  accepted?: boolean;
  rejection_reason?: string;
  responded_at?: string;
  created_at: string;
}

export interface PreTripChecklist {
  id: string;
  plan_id: string;
  driver_id: string;
  checklist_data: ChecklistData;
  is_complete: boolean;
  submitted_at?: string;
  created_at: string;
}

export interface ChecklistData {
  brakes: boolean;
  lights: boolean;
  tires: boolean;
  fire_extinguisher: boolean;
  adr_docs: boolean;
  horn: boolean;
  mirrors: boolean;
  fuel_level: boolean;
  cargo_secured: boolean;
  hazmat_placards: boolean;
}

export interface Epod {
  id: string;
  plan_id: string;
  driver_id: string;
  recipient_name?: string;
  signature_url?: string;
  photo_urls: string[];
  delivery_notes?: string;
  delivered_at?: string;
  created_at: string;
}

// ─── Validation Error Types ───────────────────────────────────
export type ValidationErrorCode =
  | 'HAZMAT_LICENSE_ERROR'
  | 'ADR_MISSING_ERROR'
  | 'ADR_EXPIRED_ERROR'
  | 'EV_LOW_BATTERY_ERROR'
  | 'DRIVER_OFF_SHIFT_ERROR'
  | 'DRIVER_INACTIVE_ERROR'
  | 'VEHICLE_INACTIVE_ERROR';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
}

// ─── Sustainability / CO2 ─────────────────────────────────────
export interface SustainabilitySummary {
  month: string;
  ev_trips: number;
  diesel_trips: number;
  ev_km: number;
  total_co2_saved_kg: number;
  total_co2_saved_tonnes: number;
}

// ─── API Response wrappers ────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

// ─── Form types ───────────────────────────────────────────────
export interface CreateBookingForm {
  requested_date: string;
  site_id: string;
  vehicle_type: VehicleType;
  cargo_type: CargoType;
  is_bpa_cargo: boolean;
  quantity?: number;
  unit?: string;
  notes?: string;
  route_category?: RouteCategory;
  origin_site_id?: string;
  dest_site_id?: string;
}

export interface AssignPlanForm {
  driver_id: string;
  vehicle_id: string;
  asset_id?: string;
  planned_distance_km?: number;
  dispatch_notes?: string;
}
