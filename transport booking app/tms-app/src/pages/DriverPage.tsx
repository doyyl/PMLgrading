import { useState, useRef } from 'react';
import { useRole } from '@/context/role';
import {
  useDriverTrips, useUnassignedTrips,
  useClaimTrip, useStartTrip, useCompleteTrip, uploadTripPhoto,
  useReportIssue, useTripIssues, uploadIssuePhoto, ISSUE_TYPES,
  type Trip,
} from '@/hooks/useTrips';
import {
  Truck, MapPin, Clock, CheckCircle2, Play, Camera, X,
  AlertCircle, Image as ImageIcon, Search, PlusCircle, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────

function readPhotoFile(
  e: React.ChangeEvent<HTMLInputElement>,
  onResult: (file: File, preview: string) => void,
) {
  const f = e.target.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => onResult(f, ev.target?.result as string);
  reader.readAsDataURL(f);
}

const STATUS_LABEL: Record<Trip['status'], string> = {
  unassigned:  'รอมอบหมาย',
  assigned:    'มอบหมายแล้ว',
  in_progress: 'กำลังวิ่ง',
  completed:   'เสร็จแล้ว',
  cancelled:   'ยกเลิก',
};
const STATUS_COLOR: Record<Trip['status'], string> = {
  unassigned:  'bg-gray-100 text-gray-600',
  assigned:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
};

function fmtDate(d: string | null) {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

// ── Start Trip Modal ──────────────────────────────────────────

function StartTripModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const startTrip = useStartTrip();
  const [notes, setNotes] = useState('');

  async function confirm() {
    try {
      await startTrip.mutateAsync({ tripId: trip.id, notes: notes || undefined });
      toast.success(`เริ่มเที่ยวที่ ${trip.trip_number} แล้ว`);
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-blue-600 px-5 py-4 text-white flex items-center justify-between">
          <div>
            <p className="font-bold">เริ่มเที่ยวที่ {trip.trip_number}</p>
            <p className="text-xs text-blue-200 mt-0.5">{trip.customer}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-blue-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm space-y-1.5 text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              <span>{trip.loading_place} → {trip.destination}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span>{fmtDate(trip.scheduled_date)}</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">หมายเหตุ (ไม่บังคับ)</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="หมายเหตุสินค้า, ปริมาณ..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={confirm} disabled={startTrip.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-blue-700">
            {startTrip.isPending
              ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <Play className="h-4 w-4" />}
            เริ่มงาน — บันทึกเวลาเริ่มต้น
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Close Trip Modal ──────────────────────────────────────────

function CloseTripModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const completeTrip = useCompleteTrip();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    readPhotoFile(e, (file, preview) => { setPhoto(file); setPreview(preview); });
  }

  async function handleSubmit() {
    if (!photo) return;
    setUploading(true);
    try {
      const url = await uploadTripPhoto(trip.id, photo);
      // ePOD: keep existing notes (shift label) and append the recipient
      const cargoNotes = recipient.trim()
        ? [trip.cargo_notes, `✍️ ผู้รับ: ${recipient.trim()}`].filter(Boolean).join(' · ')
        : undefined;
      await completeTrip.mutateAsync({ tripId: trip.id, photoUrl: url, cargoNotes });
      toast.success(`ปิดเที่ยวที่ ${trip.trip_number} เรียบร้อย`);
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-emerald-600 px-5 py-4 text-white flex items-center justify-between">
          <div>
            <p className="font-bold">จบเที่ยวที่ {trip.trip_number}</p>
            <p className="text-xs text-emerald-200 mt-0.5">ถ่ายรูปเพื่อยืนยันส่งมอบ</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-emerald-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
            {preview ? (
              <div className="relative">
                <img src={preview} alt="proof" className="w-full max-h-48 object-cover rounded-xl" />
                <button onClick={() => { setPhoto(null); setPreview(null); }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-3 py-4 w-full">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-200">
                  <Camera className="h-7 w-7 text-gray-500" />
                </div>
                <p className="font-semibold text-gray-700 text-sm">ถ่ายรูป / เลือกรูปภาพ</p>
                <p className="text-xs text-gray-400">รูปหลักฐานการส่งมอบสินค้า</p>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={handlePhoto} className="hidden" />

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">ชื่อผู้รับสินค้า (ไม่บังคับ)</label>
            <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)}
              placeholder="เช่น คุณสมชาย (คลังสินค้า)"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          {trip.started_at && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-4 py-2 rounded-xl">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              เริ่มงาน: {fmtTime(trip.started_at)}
            </div>
          )}

          <button onClick={handleSubmit} disabled={!photo || uploading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-emerald-700">
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

// ── Report Issue Modal ────────────────────────────────────────

function ReportIssueModal({ trip, driverId, onClose }: { trip: Trip; driverId: string; onClose: () => void }) {
  const reportIssue = useReportIssue();
  const [issueType, setIssueType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    readPhotoFile(e, (file, preview) => { setPhoto(file); setPreview(preview); });
  }

  async function submit() {
    if (!issueType) return;
    setSubmitting(true);
    try {
      const photoUrl = photo ? await uploadIssuePhoto(trip.id, photo) : undefined;
      await reportIssue.mutateAsync({
        tripId: trip.id, driverId, issueType,
        description: description.trim() || undefined, photoUrl,
      });
      toast.success('แจ้งปัญหาเรียบร้อย — ทีมงานได้รับแล้ว');
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-red-600 px-5 py-4 text-white flex items-center justify-between sticky top-0">
          <div>
            <p className="font-bold">แจ้งปัญหา — เที่ยวที่ {trip.trip_number}</p>
            <p className="text-xs text-red-200 mt-0.5">{trip.customer ?? 'ไม่ระบุลูกค้า'}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-red-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Issue type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">ประเภทปัญหา <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {ISSUE_TYPES.map(it => (
                <button key={it.value} type="button" onClick={() => setIssueType(it.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border-2 py-3 px-1 text-center transition-all',
                    issueType === it.value
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-600 hover:border-red-300'
                  )}>
                  <span className="text-xl leading-none">{it.icon}</span>
                  <span className="text-[11px] font-semibold leading-tight">{it.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">รายละเอียด</label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="อธิบายปัญหาที่พบ เช่น ยางแตกที่ กม. 45, รอโหลดของนานเกิน 2 ชม."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>

          {/* Optional photo */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">รูปภาพ (ไม่บังคับ)</label>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="issue" className="w-full max-h-40 object-cover rounded-xl" />
                <button onClick={() => { setPhoto(null); setPreview(null); }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-3 text-sm text-gray-500 hover:border-red-300">
                <Camera className="h-4 w-4" /> เพิ่มรูป
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              onChange={handlePhoto} className="hidden" />
          </div>

          <button onClick={submit} disabled={!issueType || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-red-700">
            {submitting
              ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <AlertTriangle className="h-4 w-4" />}
            ส่งแจ้งปัญหา
          </button>
          {!issueType && (
            <p className="text-center text-xs text-gray-400">เลือกประเภทปัญหาก่อนส่ง</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Trip Card ─────────────────────────────────────────────────

function TripCard({ trip, driverId, canClaim }: { trip: Trip; driverId: string; canClaim?: boolean }) {
  const [starting, setStarting] = useState(false);
  const [closing,  setClosing]  = useState(false);
  const [reporting, setReporting] = useState(false);
  const claimTrip = useClaimTrip();
  // Only the driver's own active trips can report issues / show the badge
  const isOwnTrip = !canClaim;
  const { data: issues = [] } = useTripIssues(isOwnTrip ? trip.id : null);
  const openIssues = issues.filter(i => i.status !== 'resolved');
  const canReport = isOwnTrip && (trip.status === 'assigned' || trip.status === 'in_progress');

  async function handleClaim() {
    try {
      await claimTrip.mutateAsync({ tripId: trip.id, driverId });
      toast.success('รับงานแล้ว');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
            {trip.trip_number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">{trip.customer ?? 'ไม่ระบุลูกค้า'}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_COLOR[trip.status])}>
                {STATUS_LABEL[trip.status]}
              </span>
              {trip.booking?.is_bpa_cargo && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  BPA · ต้องมี ท.4+ADR
                </span>
              )}
              {openIssues.length > 0 && (
                <span className="flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                  <AlertTriangle className="h-2.5 w-2.5" /> แจ้งปัญหาแล้ว{openIssues.length > 1 ? ` (${openIssues.length})` : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <MapPin className="h-3 w-3 text-gray-400" />
              {trip.loading_place ?? '?'} → {trip.destination ?? '?'}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <Clock className="h-3 w-3 text-gray-400" />
              {fmtDate(trip.scheduled_date)}
            </div>
            {trip.cargo_notes && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{trip.cargo_notes}</p>
            )}
            {trip.vehicle && (
              <p className="text-xs font-mono font-semibold text-gray-600 mt-0.5">🚛 {trip.vehicle.plate_number}</p>
            )}
          </div>
        </div>

        {/* Timestamps */}
        {(trip.started_at || trip.completed_at || trip.close_photo_url) && (
          <div className="flex gap-4 text-xs text-gray-400 border-t border-gray-50 pt-2">
            {trip.started_at && (
              <span className="flex items-center gap-1">
                <Play className="h-3 w-3 text-blue-400" /> {fmtTime(trip.started_at)}
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
                <ImageIcon className="h-3 w-3" /> รูป
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {canClaim && trip.status === 'unassigned' && (
            <button onClick={handleClaim} disabled={claimTrip.isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              <PlusCircle className="h-3.5 w-3.5" />
              รับงานนี้
            </button>
          )}
          {trip.status === 'assigned' && (
            <button onClick={() => setStarting(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700">
              <Play className="h-3.5 w-3.5" />
              เริ่มงาน
            </button>
          )}
          {trip.status === 'in_progress' && (
            <button onClick={() => setClosing(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">
              <Camera className="h-3.5 w-3.5" />
              ปิดงาน
            </button>
          )}
          {canReport && (
            <button onClick={() => setReporting(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100">
              <AlertTriangle className="h-3.5 w-3.5" />
              แจ้งปัญหา
            </button>
          )}
        </div>
      </div>

      {starting && <StartTripModal trip={trip} onClose={() => setStarting(false)} />}
      {closing  && <CloseTripModal  trip={trip} onClose={() => setClosing(false)} />}
      {reporting && <ReportIssueModal trip={trip} driverId={driverId} onClose={() => setReporting(false)} />}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function DriverPage() {
  const { driverId, displayName } = useRole();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'mine' | 'available'>('mine');

  const { data: myTrips = [], isLoading: loadingMine } = useDriverTrips(driverId);
  const { data: unassigned = [], isLoading: loadingAvail } = useUnassignedTrips();

  const today = new Date().toISOString().split('T')[0];

  const filterTrips = (ts: Trip[]) => {
    if (!search) return ts;
    const q = search.toLowerCase();
    return ts.filter(t =>
      (t.customer ?? '').toLowerCase().includes(q) ||
      (t.destination ?? '').toLowerCase().includes(q) ||
      (t.loading_place ?? '').toLowerCase().includes(q)
    );
  };

  const myFiltered   = filterTrips(myTrips);
  const availFiltered = filterTrips(unassigned);

  const todayMine  = myFiltered.filter(t => t.scheduled_date === today);
  const otherMine  = myFiltered.filter(t => t.scheduled_date !== today);

  const inProg = myTrips.filter(t => t.status === 'in_progress').length;
  const done   = myTrips.filter(t => t.status === 'completed').length;

  if (!driverId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-xs space-y-3">
          <AlertCircle className="h-12 w-12 text-amber-400 mx-auto" />
          <p className="font-semibold text-gray-700">ไม่พบข้อมูลพนักงานขับรถ</p>
          <p className="text-sm text-gray-500">
            บัญชีนี้ยังไม่ผูกกับข้อมูลคนขับ — ให้แอดมินรัน migration 009 ใน Supabase SQL Editor แล้ว log out และ log in ใหม่
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6 space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-emerald-600 px-5 py-5 text-white shadow-lg">
        <p className="text-xs text-emerald-200 mb-0.5">สวัสดี พนักงานขับรถ</p>
        <p className="text-xl font-bold">{displayName}</p>
        <p className="text-sm text-emerald-200 mt-1">
          {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-emerald-500 px-3 py-2.5 text-center">
            <p className="text-2xl font-bold">{todayMine.length}</p>
            <p className="text-xs text-emerald-100">งานวันนี้</p>
          </div>
          <div className="rounded-xl bg-emerald-500 px-3 py-2.5 text-center">
            <p className="text-2xl font-bold">{inProg}</p>
            <p className="text-xs text-emerald-100">กำลังวิ่ง</p>
          </div>
          <div className="rounded-xl bg-emerald-500 px-3 py-2.5 text-center">
            <p className="text-2xl font-bold">{done}</p>
            <p className="text-xs text-emerald-100">เสร็จแล้ว</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาลูกค้า, ปลายทาง..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      {/* Tab selector */}
      <div className="flex gap-2">
        <button onClick={() => setTab('mine')}
          className={cn(
            'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors',
            tab === 'mine' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          )}>
          งานของฉัน ({myTrips.length})
        </button>
        <button onClick={() => setTab('available')}
          className={cn(
            'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors',
            tab === 'available' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          )}>
          รับงานใหม่ ({unassigned.length})
        </button>
      </div>

      {/* My trips tab */}
      {tab === 'mine' && (
        loadingMine ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <>
            {todayMine.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">งานวันนี้</p>
                <div className="space-y-3">
                  {todayMine.map(t => <TripCard key={t.id} trip={t} driverId={driverId} />)}
                </div>
              </div>
            )}
            {otherMine.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">งานอื่นๆ</p>
                <div className="space-y-3">
                  {otherMine.map(t => <TripCard key={t.id} trip={t} driverId={driverId} />)}
                </div>
              </div>
            )}
            {myFiltered.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-10 text-gray-400">
                <Truck className="h-8 w-8" />
                <p className="text-sm font-medium">ยังไม่มีงาน — ไปที่ "รับงานใหม่"</p>
              </div>
            )}
          </>
        )
      )}

      {/* Available trips tab */}
      {tab === 'available' && (
        loadingAvail ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : availFiltered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-10 text-gray-400">
            <CheckCircle2 className="h-8 w-8" />
            <p className="text-sm font-medium">ไม่มีงานรอรับ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availFiltered.map(t => (
              <TripCard key={t.id} trip={t} driverId={driverId} canClaim />
            ))}
          </div>
        )
      )}
    </div>
  );
}
