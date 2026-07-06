import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Fuel, Gauge, Camera, X, CheckCircle2, PlusCircle, ArrowLeft,
  Truck, Clock, AlertTriangle, Receipt,
} from 'lucide-react';
import { useRole } from '@/context/role';
import {
  useFuelLogs, useStartFuel, useCloseFuel, uploadFuelSlip,
  useActiveVehicle, useVehicleOptions, useLastOdometer,
  type FuelLog,
} from '@/hooks/useFuel';
import { cn } from '@/lib/utils';

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

function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// ── Start Fuel Modal (Step 1 — odometer before fueling) ───────

function StartFuelModal({ driverId, onClose }: { driverId: string; onClose: () => void }) {
  const startFuel = useStartFuel();
  const { data: activeVehicle } = useActiveVehicle(driverId);
  const { data: vehicleOptions = [] } = useVehicleOptions();
  const [vehicleId, setVehicleId] = useState('');
  const [odometer, setOdometer] = useState('');

  // Auto-fill the vehicle from the driver's in-progress trip once resolved
  useEffect(() => {
    if (activeVehicle?.id && !vehicleId) setVehicleId(activeVehicle.id);
  }, [activeVehicle, vehicleId]);

  const { data: lastOdometer } = useLastOdometer(vehicleId || null);
  const odoNum = Number(odometer);
  const odoValid = Number.isFinite(odoNum) && odoNum > 0;
  const decreasing = odoValid && lastOdometer != null && odoNum < lastOdometer;

  async function confirm() {
    if (!vehicleId || !odoValid) return;
    if (decreasing) {
      const ok = window.confirm(
        `เลขไมล์ (${odoNum.toLocaleString()}) ต่ำกว่าครั้งก่อน (${lastOdometer!.toLocaleString()}) — ยืนยันหรือไม่?`,
      );
      if (!ok) return;
    }
    try {
      await startFuel.mutateAsync({ driverId, vehicleId, odometerKm: odoNum });
      toast.success('เปิดรายการเติมน้ำมันแล้ว — เติมเสร็จแล้วแนบสลิปเพื่อปิด');
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#00205C] px-5 py-4 text-white">
          <div>
            <p className="font-bold">เริ่มเติมน้ำมัน</p>
            <p className="mt-0.5 text-xs text-white/60">ใส่เลขไมล์ก่อนเติม</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              รถ <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Truck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00205C]"
              >
                <option value="">เลือกทะเบียนรถ...</option>
                {vehicleOptions.map(v => (
                  <option key={v.id} value={v.id}>{v.plate_number}</option>
                ))}
              </select>
            </div>
            {activeVehicle?.id && vehicleId === activeVehicle.id && (
              <p className="mt-1 text-xs text-emerald-600">เติมอัตโนมัติจากงานที่กำลังวิ่ง</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              เลขไมล์ก่อนเติม (กม.) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Gauge className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="number" inputMode="numeric" min={1}
                value={odometer}
                onChange={e => setOdometer(e.target.value)}
                placeholder="เช่น 125400"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00205C]"
              />
            </div>
            {decreasing && (
              <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                ต่ำกว่าครั้งก่อน ({lastOdometer!.toLocaleString()} กม.)
              </p>
            )}
          </div>

          <button
            onClick={confirm}
            disabled={!vehicleId || !odoValid || startFuel.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00205C] py-3.5 text-sm font-bold text-white hover:bg-[#001845] disabled:opacity-50"
          >
            {startFuel.isPending
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : <Fuel className="h-4 w-4" />}
            เปิดรายการ — บันทึกเลขไมล์
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Close Fuel Modal (Step 2 — slip required to close) ────────

function CloseFuelModal({ log, onClose }: { log: FuelLog; onClose: () => void }) {
  const closeFuel = useCloseFuel();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [liters, setLiters] = useState('');
  const [totalBaht, setTotalBaht] = useState('');
  const [station, setStation] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    readPhotoFile(e, (file, p) => { setPhoto(file); setPreview(p); });
  }

  async function handleSubmit() {
    if (!photo) return;
    setUploading(true);
    try {
      const url = await uploadFuelSlip(log.id, photo);
      await closeFuel.mutateAsync({
        fuelLogId: log.id,
        slipPhotoUrl: url,
        liters: liters ? Number(liters) : null,
        totalBaht: totalBaht ? Number(totalBaht) : null,
        station: station.trim() || null,
      });
      toast.success('ปิดรายการเติมน้ำมันเรียบร้อย');
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between bg-emerald-600 px-5 py-4 text-white">
          <div>
            <p className="font-bold">ปิดการเติม — {log.vehicle?.plate_number ?? 'รถ'}</p>
            <p className="mt-0.5 text-xs text-emerald-200">ถ่ายสลิปเพื่อยืนยัน</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-emerald-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-600">
            <Gauge className="h-4 w-4 text-gray-400" />
            เลขไมล์: <span className="font-semibold text-gray-800">{log.odometer_km.toLocaleString()} กม.</span>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
            {preview ? (
              <div className="relative">
                <img src={preview} alt="slip" className="max-h-48 w-full rounded-xl object-cover" />
                <button onClick={() => { setPhoto(null); setPreview(null); }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 py-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-200">
                  <Receipt className="h-7 w-7 text-gray-500" />
                </div>
                <p className="text-sm font-semibold text-gray-700">ถ่ายสลิป / เลือกรูปภาพ</p>
                <p className="text-xs text-gray-400">รูปสลิปการเติมน้ำมัน</p>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={handlePhoto} className="hidden" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">ลิตร (ไม่บังคับ)</label>
              <input type="number" inputMode="decimal" min={0} step={0.01}
                value={liters} onChange={e => setLiters(e.target.value)} placeholder="0.00"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">รวมเงิน ฿ (ไม่บังคับ)</label>
              <input type="number" inputMode="decimal" min={0} step={0.01}
                value={totalBaht} onChange={e => setTotalBaht(e.target.value)} placeholder="0.00"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">ปั๊ม (ไม่บังคับ)</label>
            <input type="text" value={station} onChange={e => setStation(e.target.value)}
              placeholder="เช่น ปตท. สาขาบางนา"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <button onClick={handleSubmit} disabled={!photo || uploading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
            {uploading
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : <CheckCircle2 className="h-4 w-4" />}
            {uploading ? 'กำลังบันทึก...' : 'ปิดรายการ — บันทึกสลิป'}
          </button>
          {!photo && (
            <p className="text-center text-xs text-gray-400">ต้องถ่ายสลิปก่อนถึงจะปิดได้</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Fuel log card ─────────────────────────────────────────────

function FuelCard({ log, onCloseRecord }: { log: FuelLog; onCloseRecord: (log: FuelLog) => void }) {
  const isOpen = log.status === 'open';
  return (
    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-900">🚛 {log.vehicle?.plate_number ?? 'ไม่ระบุรถ'}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
            <Gauge className="h-3 w-3 text-gray-400" /> {log.odometer_km.toLocaleString()} กม.
          </p>
        </div>
        <span className={cn(
          'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
          isOpen ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700',
        )}>
          {isOpen ? 'รอปิด (แนบสลิป)' : 'ปิดแล้ว'}
        </span>
      </div>

      {!isOpen && (log.liters != null || log.total_baht != null || log.station) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-50 pt-2 text-xs text-gray-500">
          {log.liters != null && <span>⛽ {log.liters} ลิตร</span>}
          {log.total_baht != null && <span>💰 {log.total_baht.toLocaleString()} ฿</span>}
          {log.station && <span>📍 {log.station}</span>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" /> {fmtDateTime(log.created_at)}
        </span>
        {isOpen ? (
          <button onClick={() => onCloseRecord(log)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
            <Camera className="h-3.5 w-3.5" /> ปิดการเติม
          </button>
        ) : log.slip_photo_url ? (
          <a href={log.slip_photo_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-blue-500">
            <Receipt className="h-3.5 w-3.5" /> ดูสลิป
          </a>
        ) : null}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function FuelPage() {
  const { driverId } = useRole();
  const navigate = useNavigate();
  const { data: logs = [], isLoading } = useFuelLogs(driverId);
  const [starting, setStarting] = useState(false);
  const [closing, setClosing] = useState<FuelLog | null>(null);

  const openLogs = logs.filter(l => l.status === 'open');
  const closedLogs = logs.filter(l => l.status === 'closed');

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/menu')}
          className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-black text-gray-900">เติมน้ำมัน</h1>
      </div>

      <button onClick={() => setStarting(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00205C] py-3.5 text-sm font-bold text-white hover:bg-[#001845]">
        <PlusCircle className="h-4 w-4" /> เริ่มเติมน้ำมัน
      </button>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : (
        <>
          {openLogs.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-amber-500">รอปิด</p>
              <div className="space-y-3">
                {openLogs.map(l => <FuelCard key={l.id} log={l} onCloseRecord={setClosing} />)}
              </div>
            </div>
          )}

          {closedLogs.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">ประวัติ</p>
              <div className="space-y-3">
                {closedLogs.map(l => <FuelCard key={l.id} log={l} onCloseRecord={setClosing} />)}
              </div>
            </div>
          )}

          {logs.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-10 text-gray-400">
              <Fuel className="h-8 w-8" />
              <p className="text-sm font-medium">ยังไม่มีรายการเติมน้ำมัน</p>
            </div>
          )}
        </>
      )}

      {starting && driverId && <StartFuelModal driverId={driverId} onClose={() => setStarting(false)} />}
      {closing && <CloseFuelModal log={closing} onClose={() => setClosing(null)} />}
    </div>
  );
}
