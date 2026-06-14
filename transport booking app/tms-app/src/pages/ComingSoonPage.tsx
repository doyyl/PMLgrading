import { Wrench } from 'lucide-react';

export default function ComingSoonPage() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center p-8">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-100">
          <Wrench className="h-10 w-10 text-blue-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">กำลังพัฒนา</h1>
        <p className="text-sm text-gray-500">หน้านี้อยู่ระหว่างพัฒนา — Coming Soon</p>
      </div>
    </div>
  );
}
