'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAcknowledgeEvent } from '@/hooks/useTracking';
import { getSeverityColor, formatDate } from '@/lib/utils';
import type { TripEvent } from '@/types';

interface TelematicsEventsListProps {
  events: TripEvent[];
}

const severityBadge = { Info: 'info' as const, Warning: 'warning' as const, Critical: 'danger' as const };

const eventIcons: Record<string, string> = {
  'Harsh Braking': '🛑',
  'Harsh Acceleration': '🚀',
  'Speeding': '⚡',
  'Fatigue Alert': '😴',
  'AI Camera Alert': '📷',
  'Start Prevent': '🔒',
  'Geofence Entry': '📍',
  'Geofence Exit': '📍',
  'Engine On': '🟢',
  'Engine Off': '⚫',
};

export function TelematicsEventsList({ events }: TelematicsEventsListProps) {
  const ackEvent = useAcknowledgeEvent();

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Bell className="mb-2 h-8 w-8 opacity-30" />
        <p className="text-sm">No telematics events</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {events.map((ev) => (
        <div key={ev.id} className={`flex items-start gap-3 px-4 py-3 ${ev.acknowledged ? 'opacity-50' : ''}`}>
          <div className={`mt-0.5 rounded-lg border p-2 text-sm ${getSeverityColor(ev.severity)}`}>
            {eventIcons[ev.event_type] ?? '📌'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">{ev.event_type}</p>
              <Badge variant={severityBadge[ev.severity]}>{ev.severity}</Badge>
              {ev.acknowledged && <span className="text-xs text-gray-400">Ack'd</span>}
            </div>
            {ev.description && <p className="mt-0.5 text-xs text-gray-500">{ev.description}</p>}
            {ev.speed_kmh != null && (
              <p className="mt-0.5 text-xs text-gray-400">{ev.speed_kmh} km/h at time of event</p>
            )}
            {ev.media_url && (
              <img
                src={ev.media_url}
                alt="AI Camera snapshot"
                className="mt-2 h-20 w-32 rounded-lg object-cover border border-gray-200"
              />
            )}
            <p className="mt-1 text-xs text-gray-400">{formatDate(ev.recorded_at, 'dd MMM yyyy HH:mm')}</p>
          </div>
          {!ev.acknowledged && ev.severity !== 'Info' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => ackEvent.mutate(ev.id)}
              loading={ackEvent.isPending}
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
