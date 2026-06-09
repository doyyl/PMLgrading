import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/driver-app/jobs
 * Returns the list of plans assigned to the authenticated driver for today.
 * Query params: ?date=YYYY-MM-DD  (defaults to today)
 *
 * POST /api/driver-app/jobs
 * Accept or reject a job.
 * Body: { plan_id, accepted: boolean, rejection_reason?: string }
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0];

  // Resolve driver record from user metadata (employee_id in JWT)
  const { data: driver } = await supabase
    .from('drivers')
    .select('id, name, license_type, adr_certificate_expiry')
    .eq('employee_id', user.user_metadata?.employee_id)
    .single();

  if (!driver) {
    return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });
  }

  const { data: plans, error } = await supabase
    .from('daily_plans')
    .select(`
      id, plan_date, status, route_category, planned_distance_km, dispatch_notes,
      booking:bookings(booking_ref, cargo_type, is_bpa_cargo, quantity, unit, notes,
        site:sites(site_name, loading_location, latitude, longitude)),
      vehicle:vehicles(plate_number, vehicle_type, powertrain, battery_soc),
      asset:assets(asset_id, asset_type, status)
    `)
    .eq('driver_id', driver.id)
    .eq('plan_date', date)
    .in('status', ['Assigned', 'Dispatched', 'In Progress']);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: plans, driver });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { plan_id, accepted, rejection_reason } = body;

  if (!plan_id || accepted === undefined) {
    return NextResponse.json({ error: 'plan_id and accepted are required' }, { status: 400 });
  }

  const { data: driver } = await supabase
    .from('drivers')
    .select('id')
    .eq('employee_id', user.user_metadata?.employee_id)
    .single();

  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

  // Upsert acceptance record
  const { data, error } = await supabase
    .from('job_acceptances')
    .upsert({
      plan_id,
      driver_id: driver.id,
      accepted,
      rejection_reason: rejection_reason ?? null,
      responded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If accepted, update plan status to In Progress
  if (accepted) {
    await supabase
      .from('daily_plans')
      .update({ status: 'Dispatched' })
      .eq('id', plan_id)
      .eq('driver_id', driver.id);
  }

  return NextResponse.json({ data });
}
