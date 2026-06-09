import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/driver-app/tracking
 * Ingest a GPS tracking point from the driver app.
 * Supports dual GPS platform sources (GPS1 / GPS2).
 *
 * Body: {
 *   plan_id, latitude, longitude, speed_kmh, heading,
 *   altitude_m?, platform_source: 'GPS1' | 'GPS2',
 *   event_type?, event_detail?
 * }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    plan_id,
    latitude,
    longitude,
    speed_kmh,
    heading,
    altitude_m,
    platform_source = 'GPS1',
    event_type,
    event_detail,
  } = body;

  if (!plan_id || latitude == null || longitude == null) {
    return NextResponse.json(
      { error: 'plan_id, latitude, and longitude are required' },
      { status: 400 }
    );
  }

  const allowedSources = ['GPS1', 'GPS2', 'Manual'];
  if (!allowedSources.includes(platform_source)) {
    return NextResponse.json({ error: `platform_source must be one of: ${allowedSources.join(', ')}` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tracking')
    .insert({
      plan_id,
      trip_status: 'In Progress',
      latitude,
      longitude,
      speed_kmh: speed_kmh ?? null,
      heading: heading ?? null,
      altitude_m: altitude_m ?? null,
      platform_source,
      event_type: event_type ?? null,
      event_detail: event_detail ?? null,
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If a telematics event is present, also insert into trip_events for alerting
  if (event_type) {
    const severity = ['Harsh Braking', 'Fatigue Alert', 'AI Camera Alert', 'Start Prevent'].includes(event_type)
      ? 'Critical'
      : 'Warning';

    await supabase.from('trip_events').insert({
      plan_id,
      event_type,
      severity,
      latitude,
      longitude,
      speed_kmh: speed_kmh ?? null,
      description: event_detail?.description ?? null,
      media_url: event_detail?.media_url ?? null,
      recorded_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ data });
}
