import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// GET — ดึง services ของ branch
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId')
  if (!branchId) return NextResponse.json({ error: 'branchId required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('branch_id', branchId)
    .order('price')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ services: data })
}

// POST — เพิ่ม service ใหม่
export async function POST(req: Request) {
  const { branchId, name, description, duration_minutes, price } = await req.json()
  if (!branchId || !name || !duration_minutes || price === undefined)
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .insert({ branch_id: branchId, name, description, duration_minutes, price, is_active: true })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data })
}

// PATCH — แก้ไข service
export async function PATCH(req: Request) {
  const { id, name, description, duration_minutes, price, is_active } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .update({ name, description, duration_minutes, price, is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data })
}

// DELETE — ลบ service (soft delete)
export async function DELETE(req: Request) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase
    .from('services')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
