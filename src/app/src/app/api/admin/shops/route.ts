import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shops')
    .select(`
      id, name, slug, phone, is_active,
      line_channel_id, line_admin_group_id, line_liff_id,
      branches ( id, name )
    `)
    .is('deleted_at', null)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shops: data })
}

export async function POST(req: Request) {
  const {
    name, slug, phone,
    line_channel_id, line_channel_secret,
    line_access_token, line_admin_group_id, line_liff_id,
  } = await req.json()

  if (!name || !slug)
    return NextResponse.json({ error: 'name และ slug จำเป็น' }, { status: 400 })

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('shops').select('id').eq('slug', cleanSlug).maybeSingle()
  if (existing)
    return NextResponse.json({ error: 'slug นี้ถูกใช้แล้ว' }, { status: 409 })

  const { data, error } = await supabase
    .from('shops')
    .insert({
      name, slug: cleanSlug, phone,
      line_channel_id, line_channel_secret,
      line_access_token, line_admin_group_id, line_liff_id,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shop: data })
}

export async function PATCH(req: Request) {
  const {
    id, name, phone, is_active,
    line_channel_id, line_channel_secret,
    line_access_token, line_admin_group_id, line_liff_id,
  } = await req.json()

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shops')
    .update({
      name, phone, is_active,
      line_channel_id, line_channel_secret,
      line_access_token, line_admin_group_id, line_liff_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shop: data })
}
