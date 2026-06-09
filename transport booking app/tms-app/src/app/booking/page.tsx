import { BookingWizard } from '@/components/booking/BookingWizard';

export const metadata = { title: 'จองรถ — KNS TMS' };

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50/50 to-white">
      <div className="mx-auto max-w-xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
            <span className="text-2xl">🚛</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">จองรถขนส่ง</h1>
          <p className="mt-1 text-sm text-gray-500">กรอกข้อมูลทีละขั้นตอน ใช้เวลาไม่ถึง 2 นาที</p>
        </div>

        {/* Wizard */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
          <BookingWizard />
        </div>
      </div>
    </div>
  );
}
