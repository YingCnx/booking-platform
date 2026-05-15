import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAdminSession } from '@/lib/admin-session'

// GET: ดู admin ของ shop ที่กำลังเลือก
export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!session.selectedShopId) return NextResponse.json({ admins: [] })

  const supabase = await createClient()
  const { data } = await supabase
    .from('shop_admins')
    .select(`
      id, role, created_at,
      admin_users ( id, line_user_id, display_name, is_active )
    `)
    .eq('shop_id', session.selectedShopId)

  return NextResponse.json({ admins: data ?? [] })
}

// POST: เพิ่ม admin ใหม่ให้ shop
export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!session.selectedShopId) return NextResponse.json({ error: 'no shop selected' }, { status: 400 })

  // เช็คว่าเป็น owner หรือ super
  const myRole = session.shops.find(s => s.id === session.selectedShopId)?.role
  if (myRole !== 'owner' && session.role !== 'super') {
    return NextResponse.json({ error: 'ต้องเป็นเจ้าของร้านถึงเพิ่ม admin ได้' }, { status: 403 })
  }

  const { lineUserId, displayName, role } = await req.json()
  if (!lineUserId) return NextResponse.json({ error: 'lineUserId required' }, { status: 400 })

  const supabase = await createClient()

  // upsert admin_user
  let { data: admin } = await supabase
    .from('admin_users')
    .select('id')
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  if (!admin) {
    const { data: created, error } = await supabase
      .from('admin_users')
      .insert({
        line_user_id: lineUserId,
        display_name: displayName ?? '',
        role: 'shop_admin',
      })
      .select('id')
      .single()
    if (error || !created) return NextResponse.json({ error: error?.message }, { status: 500 })
    admin = created
  }

  // เพิ่ม shop_admin
  const { error: linkErr } = await supabase
    .from('shop_admins')
    .insert({
      admin_user_id: admin.id,
      shop_id: session.selectedShopId,
      role: role ?? 'staff',
    })

  if (linkErr) {
    if (linkErr.code === '23505') {
      return NextResponse.json({ error: 'admin นี้อยู่ในร้านแล้ว' }, { status: 409 })
    }
    return NextResponse.json({ error: linkErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE: ลบ admin ออกจาก shop
export async function DELETE(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const myRole = session.shops.find(s => s.id === session.selectedShopId)?.role
  if (myRole !== 'owner' && session.role !== 'super') {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const shopAdminId = searchParams.get('id')
  if (!shopAdminId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  await supabase.from('shop_admins').delete().eq('id', shopAdminId)
  return NextResponse.json({ ok: true })
}
