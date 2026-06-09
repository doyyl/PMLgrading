'use client';

import { useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ActiveTripsList } from '@/components/tracking/ActiveTripsList';
import { TelematicsEventsList } from '@/components/tracking/TelematicsEventsList';
import { useActivePlans, useTripEvents, useLiveEvents } from '@/hooks/useTracking';
import { useTrackingStore } from '@/store/trackingStore';

export default function TrackingPage() {
  const today = new Date().toISOString().split('T')[0];
  const { data: plans = [], isLoading } = useActivePlans(today);
  const { selectedPlan } = useTrackingStore();
  const { data: events = [] } = useTripEvents(selectedPlan?.id ?? '');

  // Subscribe to live telematics events for selected plan
  useLiveEvents(selectedPlan?.id);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Live Tracking & Telematics</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time trip monitoring with dual GPS platform support and safety event alerts.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Active trips list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Active Trips</h3>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {plans.length} dispatched
            </span>
          </CardHeader>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading trips…</div>
            ) : (
              <ActiveTripsList plans={plans} />
            )}
          </CardBody>
        </Card>

        {/* Telematics events */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <h3 className="font-semibold text-gray-900">
                {selectedPlan ? `Events — ${selectedPlan.booking?.booking_ref}` : 'Telematics Events'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedPlan ? 'Click another trip to switch' : 'Select a trip to view events'}
              </p>
            </div>
            {events.filter((e) => !e.acknowledged && e.severity !== 'Info').length > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 animate-pulse">
                {events.filter((e) => !e.acknowledged && e.severity !== 'Info').length} unacknowledged
              </span>
            )}
          </CardHeader>
          <CardBody className="p-0 max-h-[560px] overflow-y-auto">
            <TelematicsEventsList events={events} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
