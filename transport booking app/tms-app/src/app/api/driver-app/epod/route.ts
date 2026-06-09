import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/driver-app/epod
 * Submit electronic Proof of Delivery.
 * Body (multipart/form-data):
 *   plan_id         - UUID
 *   recipient_name  - string
 *   delivery_notes  - string (optional)
 *   signature       - File (base64 PNG or file upload)
 *   photos[]        - File[] (up to 5 delivery photos)
 *
 * GET /api/driver-app/epod?plan_id=
 * Retrieve the ePOD for a plan (for dispatcher/admin view).
 */

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const plan_id = formData.get('plan_id') as string;
  const recipient_name = formData.get('recipient_name') as string;
  const delivery_notes = formData.get('delivery_notes') as string | null;
  const signature = formData.get('signature') as File | null;
  const photos = formData.getAll('photos') as File[];

  if (!plan_id || !recipient_name) {
    return NextResponse.json({ error: 'plan_id and recipient_name are required' }, { status: 400 });
  }
  if (!signature) {
    return NextResponse.json({ error: 'Signature is required for ePOD' }, { status: 400 });
  }

  const { data: driver } = await supabase
    .from('drivers')
    .select('id')
    .eq('employee_id', user.user_metadata?.employee_id)
    .single();

  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

  // Upload signature to Supabase Storage
  const sigBuffer = await signature.arrayBuffer();
  const sigPath = `epod/${plan_id}/signature_${Date.now()}.png`;
  const { error: sigUploadError } = await supabase.storage
    .from('epod-files')
    .upload(sigPath, sigBuffer, { contentType: 'image/png', upsert: true });

  if (sigUploadError) {
    return NextResponse.json({ error: `Signature upload failed: ${sigUploadError.message}` }, { status: 500 });
  }

  const { data: { publicUrl: signatureUrl } } = supabase.storage
    .from('epod-files')
    .getPublicUrl(sigPath);

  // Upload delivery photos (max 5)
  const photoUrls: string[] = [];
  for (const photo of photos.slice(0, 5)) {
    const photoBuffer = await photo.arrayBuffer();
    const photoPath = `epod/${plan_id}/photo_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const { error: photoErr } = await supabase.storage
      .from('epod-files')
      .upload(photoPath, photoBuffer, { contentType: photo.type, upsert: true });

    if (!photoErr) {
      const { data: { publicUrl } } = supabase.storage.from('epod-files').getPublicUrl(photoPath);
      photoUrls.push(publicUrl);
    }
  }

  // Save ePOD record
  const { data, error } = await supabase
    .from('epod')
    .upsert({
      plan_id,
      driver_id: driver.id,
      recipient_name,
      signature_url: signatureUrl,
      photo_urls: photoUrls,
      delivery_notes: delivery_notes ?? null,
      delivered_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark plan as Completed
  await supabase
    .from('daily_plans')
    .update({ status: 'Completed', completed_at: new Date().toISOString() })
    .eq('id', plan_id)
    .eq('driver_id', driver.id);

  return NextResponse.json({
    data,
    message: 'Delivery confirmed. ePOD submitted successfully.',
  });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plan_id = req.nextUrl.searchParams.get('plan_id');
  if (!plan_id) return NextResponse.json({ error: 'plan_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('epod')
    .select('*')
    .eq('plan_id', plan_id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'ePOD not found' }, { status: 404 });

  return NextResponse.json({ data });
}
