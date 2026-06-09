import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/driver-app/checklist?plan_id=
 * Returns existing pre-trip checklist for a plan, or an empty template.
 *
 * POST /api/driver-app/checklist
 * Submit the pre-trip safety checklist.
 * Body: { plan_id, checklist_data: ChecklistData }
 */

const CHECKLIST_FIELDS = [
  'brakes', 'lights', 'tires', 'fire_extinguisher', 'adr_docs',
  'horn', 'mirrors', 'fuel_level', 'cargo_secured', 'hazmat_placards',
];

function validateChecklist(data: Record<string, unknown>): string | null {
  for (const field of CHECKLIST_FIELDS) {
    if (typeof data[field] !== 'boolean') {
      return `Missing or invalid field: ${field}`;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plan_id = req.nextUrl.searchParams.get('plan_id');
  if (!plan_id) return NextResponse.json({ error: 'plan_id required' }, { status: 400 });

  const { data } = await supabase
    .from('pre_trip_checklists')
    .select('*')
    .eq('plan_id', plan_id)
    .maybeSingle();

  // Return existing or empty template
  const template = CHECKLIST_FIELDS.reduce<Record<string, boolean>>((acc, f) => {
    acc[f] = false;
    return acc;
  }, {});

  return NextResponse.json({
    data: data ?? { checklist_data: template, is_complete: false },
    template_fields: CHECKLIST_FIELDS,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { plan_id, checklist_data } = body;

  if (!plan_id || !checklist_data) {
    return NextResponse.json({ error: 'plan_id and checklist_data are required' }, { status: 400 });
  }

  const validationError = validateChecklist(checklist_data);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422 });
  }

  const is_complete = CHECKLIST_FIELDS.every((f) => checklist_data[f] === true);

  const { data: driver } = await supabase
    .from('drivers')
    .select('id')
    .eq('employee_id', user.user_metadata?.employee_id)
    .single();

  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('pre_trip_checklists')
    .upsert({
      plan_id,
      driver_id: driver.id,
      checklist_data,
      is_complete,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If not all items checked, surface which are incomplete
  if (!is_complete) {
    const incomplete = CHECKLIST_FIELDS.filter((f) => !checklist_data[f]);
    return NextResponse.json({
      data,
      warning: `Checklist incomplete. Pending items: ${incomplete.join(', ')}`,
    });
  }

  return NextResponse.json({ data, message: 'Pre-trip checklist completed. Safe travels!' });
}
