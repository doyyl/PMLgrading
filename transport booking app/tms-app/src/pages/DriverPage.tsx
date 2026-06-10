import { useState, useRef } from 'react';
import { useRole } from '@/context/role';
import {
  useDriverPlans, useTripsForPlan, useCreateTrip, useCompleteTrip,
  uploadTripPhoto, type TripPlan, type Trip,
} from '@/hooks/useTrips';
import {
  Truck, MapPin, Clock, CheckCircle2, Play, Camera, X,
  ChevronDown, ChevronUp, AlertCircle, Image as ImageIcon, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Status helpers ────────────────────────────────────────────

const PLAN_STATUS: Record<string, string> = {
  Draft:      'bg-gray-100 text-gray-600',
  Assigned:   'bg-amber-100 text-amber-700',
  Dispatched: 'bg-blue-100 text-blue-700',
  Completed:  'bg-emerald-100 text-emerald-700',
  Cancelled:  'bg-red-100 text-red-600',
};

const TRIP_STATUS: Record<string, { label: string; cls: string }> = {
  pending:     { label: 'รอเริ่ม',   cls: 'bg-gray-100 text-gray-500' },
  in_progress: { label: 'กำลังทำ', cls: 'bg-blue-100 text-blue-700' },
  completed:   { label: 'เสร็จแล้ว', cls: 'bg-emerald-100 text-emerald-700' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

// ── Start Trip Modal ──────────────────────────────────────────

interface StartTripModalProps {
  plan: TripPlan;
  nextTripNumber: number;
  driverId: string;
  onClose: () => void;
}

function StartTripModal({ plan, nextTripNumber, driverId, onClose }: StartTripModalProps) {
  const [destination, setDestination] = useState(plan.booking?.delivery_place ?? '');
  const [customer, setCustomer] = useState(plan.booking?.customer ?? '');
  const [notes, setNotes] = useState('');
  const { mutate, isPending } = useCreateTrip();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({
      plan_id: plan.id,
      driver_id: driverId,
      trip_number: nextTripNumber,
      destination,
      customer,
      cargo_notes: notes,
    }, {
      onSuccess: () => {
        toast.success(`เริ่มเที่ยวที่ ${nextTripNumber} แล้ว`);
        onClose();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
        <div className="bg-blue-600 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-base">เริ่มเที่ยวที่ {nextTripNumber}</p>
              <p className="text-xs text-blue-200 mt-0.5">{plan.booking?.booking_ref}</p>
            </div>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-blue-500 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">ปลายทาง *</label>
            <input
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              required
              placeholder="ระบุปลายทาง"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">ลูกค้า</label>
            <input
              type="text"
              value={customer}
              onChange={e => setCustomer(e.target.value)}
              placeholder="ชื่อลูกค้า"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">หมายเหตุสินค้า</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="ประเภทสินค้า, ปริมาณ, หมายเหตุ..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !destination}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white disabled:opacity-50 transition-colors hover:bg-blue-700 active:scale-95"
          >
            {isPending
              ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <Play className="h-4 w-4" />}
            {isPending ? 'กำลังบันทึก...' : 'เริ่มงาน — บันทึกเวลาเริ่มต้น'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Close Trip Modal (photo capture) ─────────────────────────

interface CloseTripModalProps {
  trip: Trip;
  planId: string;
  onClose: () => void;
}

function CloseTripModal({ trip, planId, onClose }: CloseTripModalProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { mutate } = useCompleteTrip();

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function handleSubmit() {
    if (!photo) return;
    setUploading(true);
    try {
      const url = await uploadTripPhoto(trip.id, photo);
      mutate({ tripId: trip.id, photoUrl: url, planId }, {
        onSuccess: () => {
          toast.success(`ปิดเที่ยวที่ ${trip.trip_number} เรียบร้อย`);
          onClose();
        },
        onError: (err) => { toast.error(err.message); setUploading(false); },
      });
    } catch (err: any) {
      toast.error(err.message);
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
        <div className="bg-emerald-600 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-base">จบเที่ยวที่ {trip.trip_number}</p>
              <p className="text-xs text-emerald-200 mt-0.5">ถ่ายรูปเพื่อยืนยันการส่งมอบ</p>
            </div>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-emerald-500 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
            {preview ? (
              <div className="relative">
                <img src={preview} alt="proof" className="w-full max-h-48 object-cover rounded-xl" />
                <button
                  onClick={() => { setPhoto(null); setPreview(null); }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-3 py-4 w-full"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-200">
                  <Camera className="h-7 w-7 text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-700 text-sm">ถ่ายรูป / เลือกรูปภาพ</p>
                  <p className="text-xs text-gray-400 mt-0.5">รูปหลักฐานการส่งมอบสินค้า</p>
                </div>
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />

          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm space-y-1.5">
            {trip.destination && (
              <div className="flex gap-2 text-gray-600">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
                <span>{trip.destination}</span>
              </div>
            )}
            {trip.started_at && (
              <div className="flex gap-2 text-gray-600">
                <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
                <span>เริ่มงาน: {fmtTime(trip.started_at)}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!photo || uploading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white disabled:opacity-50 transition-colors hover:bg-emerald-700 active:scale-95"
          >
            {uploading
              ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <CheckCircle2 className="h-4 w-4" />}
            {uploading ? 'กำลังบันทึก...' : 'ปิดงาน — บันทึกเวลาเสร็จ'}
          </button>

          {!photo && (
            <p className="text-center text-xs text-gray-400">ต้องถ่ายรูปก่อนถึงจะปิดงานได้</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Trip Row ──────────────────────────────────────────────────

function TripRow({
  trip, plan, driverId,
}: { trip: Trip; plan: TripPlan; driverId: string }) {
  const [closing, setClosing] = useState(false);

  const ts = TRIP_STATUS[trip.status];

  return (
    <>
      <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-600">
          {trip.trip_number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 truncate">{trip.destination ?? '–'}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', ts.cls)}>{ts.label}</span>
          </div>
          {trip.customer && <p className="text-xs text-gray-500 mt-0.5">{trip.customer}</p>}
          {trip.cargo_notes && <p className="text-xs text-gray-400 mt-0.5">{trip.cargo_notes}</p>}

          <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
            {trip.started_at && (
              <span className="flex items-center gap-1">
                <Play className="h-3 w-3" /> {fmtTime(trip.started_at)}
              </span>
            )}
            {trip.completed_at && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> {fmtTime(trip.completed_at)}
              </span>
            )}
            {trip.close_photo_url && (
              <a href={trip.close_photo_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-blue-500">
                <ImageIcon className="h-3 w-3" /> รูปหลักฐาน
              </a>
            )}
          </div>
        </div>

        {trip.status === 'in_progress' && (
          <button
            onClick={() => setClosing(true)}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
          >
            <Camera className="h-3.5 w-3.5" />
            จบงาน
          </button>
        )}
      </div>

      {closing && (
        <CloseTripModal
          trip={trip}
          planId={plan.id}
          onClose={() => setClosing(false)}
        />
      )}
    </>
  );
}

// ── Plan Card ─────────────────────────────────────────────────

function PlanCard({ plan, driverId }: { plan: TripPlan; driverId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [startingTrip, setStartingTrip] = useState(false);
  const { data: trips = [], isLoading } = useTripsForPlan(expanded ? plan.id : null);

  const completedTrips = trips.filter(t => t.status === 'completed').length;
  const inProgressTrips = trips.filter(t => t.status === 'in_progress').length;
  const maxTrips = plan.trip_count ?? 1;
  const nextTripNumber = trips.length + 1;
  const canStartNewTrip = plan.status === 'Dispatched' && inProgressTrips === 0 && nextTripNumber <= maxTrips;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Truck className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">
              {plan.booking?.booking_ref ?? plan.id.slice(0, 8)}
            </span>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', PLAN_STATUS[plan.status])}>
              {plan.status}
            </span>
          </div>

          <div className="mt-1 space-y-0.5 text-xs text-gray-500">
            {plan.booking?.customer && (
              <p>{plan.booking.customer}</p>
            )}
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-gray-400" />
              {plan.booking?.delivery_place ?? plan.booking?.loading_place ?? '–'}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-400" />
              {fmtDate(plan.plan_date)}
              {plan.vehicle && <span className="ml-2">{plan.vehicle.plate_number}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="text-xs font-semibold text-gray-700">
            {completedTrips}/{maxTrips} เที่ยว
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {/* Trip progress bar */}
      {maxTrips > 0 && (
        <div className="px-4 pb-1">
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(completedTrips / maxTrips) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-2 border-t border-gray-100 mt-2">
          {isLoading ? (
            <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
          ) : (
            <>
              {trips.length === 0 && (
                <p className="text-xs text-gray-400 py-2 text-center">
                  {plan.status === 'Dispatched'
                    ? 'กดเริ่มเที่ยวแรกเพื่อเปิดงาน'
                    : 'ยังไม่มีเที่ยวงาน'}
                </p>
              )}
              {trips.map(t => (
                <TripRow key={t.id} trip={t} plan={plan} driverId={driverId} />
              ))}
            </>
          )}

          {canStartNewTrip && (
            <button
              onClick={() => setStartingTrip(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors active:scale-95"
            >
              <Play className="h-4 w-4" />
              เริ่มเที่ยวที่ {nextTripNumber}
            </button>
          )}

          {completedTrips >= maxTrips && maxTrips > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              ครบทุกเที่ยวแล้ว ({completedTrips}/{maxTrips})
            </div>
          )}

          {plan.dispatch_notes && (
            <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">{plan.dispatch_notes}</p>
          )}
        </div>
      )}

      {startingTrip && (
        <StartTripModal
          plan={plan}
          nextTripNumber={nextTripNumber}
          driverId={driverId}
          onClose={() => setStartingTrip(false)}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function DriverPage() {
  const { driverId, displayName } = useRole();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: plans = [], isLoading } = useDriverPlans(driverId);

  const today = new Date().toISOString().split('T')[0];

  const filtered = plans.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.booking?.booking_ref?.toLowerCase().includes(q) ||
      p.booking?.customer?.toLowerCase().includes(q) ||
      p.booking?.delivery_place?.toLowerCase().includes(q) ||
      p.booking?.loading_place?.toLowerCase().includes(q)
    );
  });

  const todayPlans = filtered.filter(p => p.plan_date === today);
  const otherPlans = filtered.filter(p => p.plan_date !== today);

  if (!driverId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">ไม่พบข้อมูลพนักงานขับรถ</p>
          <p className="text-sm text-gray-500 mt-1">กรุณาล็อกอินด้วยบัญชี driver</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6 space-y-5">
      {/* Header greeting */}
      <div className="rounded-2xl bg-emerald-600 px-5 py-5 text-white shadow-lg shadow-emerald-100">
        <p className="text-xs text-emerald-200 mb-0.5">สวัสดี พนักงานขับรถ</p>
        <p className="text-xl font-bold">{displayName}</p>
        <p className="text-sm text-emerald-200 mt-1">
          {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-emerald-500 px-3 py-2.5 text-center">
            <p className="text-2xl font-bold">{todayPlans.length}</p>
            <p className="text-xs text-emerald-100">งานวันนี้</p>
          </div>
          <div className="rounded-xl bg-emerald-500 px-3 py-2.5 text-center">
            <p className="text-2xl font-bold">{plans.filter(p => p.status === 'Dispatched').length}</p>
            <p className="text-xs text-emerald-100">รอดำเนินการ</p>
          </div>
          <div className="rounded-xl bg-emerald-500 px-3 py-2.5 text-center">
            <p className="text-2xl font-bold">{plans.filter(p => p.status === 'Completed').length}</p>
            <p className="text-xs text-emerald-100">เสร็จแล้ว</p>
          </div>
        </div>
      </div>

      {/* Search & filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาลูกค้า, ปลายทาง, เลขจอง..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'Dispatched', 'Completed', 'Assigned'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                statusFilter === s
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {s === 'all' ? 'ทั้งหมด' : s === 'Dispatched' ? 'รอดำเนินการ' : s === 'Completed' ? 'เสร็จแล้ว' : 'มอบหมายแล้ว'}
            </button>
          ))}
        </div>
      </div>

      {/* Today's plans */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <>
          {todayPlans.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">งานวันนี้</p>
              <div className="space-y-3">
                {todayPlans.map(p => <PlanCard key={p.id} plan={p} driverId={driverId} />)}
              </div>
            </div>
          )}

          {otherPlans.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">งานอื่นๆ</p>
              <div className="space-y-3">
                {otherPlans.map(p => <PlanCard key={p.id} plan={p} driverId={driverId} />)}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-10 text-gray-400">
              <Truck className="h-8 w-8" />
              <p className="text-sm font-medium">ไม่พบงานที่ตรงกับเงื่อนไข</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
