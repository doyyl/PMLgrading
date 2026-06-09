import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { BookingForm } from '@/components/booking/BookingForm';

export const metadata = { title: 'New Booking — KNS TMS' };

export default function BookingPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Transport Booking</h1>
        <p className="text-sm text-gray-500 mt-1">Submit a request for road transport. Hazardous cargo triggers automatic license and ADR validation during planning.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Booking Details</h2>
        </CardHeader>
        <CardBody>
          <BookingForm />
        </CardBody>
      </Card>
    </div>
  );
}
