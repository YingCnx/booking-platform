import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { setAdminSession } from '@/lib/admin-session'

async function verifyLineIdToken(idToken: string, channelId: string): Promise<{ sub: string; name?: string; picture?: string } | null> {
  try {
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function POST(req: Request) {
  const { idToken, displayName, pictureUrl, liffId } = await req.json()

  if (!idToken || !liffId) {
    return NextResponse.json({ error: 'idToken และ liffId required' }, { status: 400 })
  }

  const supabase = await createClient()

  // หา channel_id จาก liffId
  const { data: shop } = await supabase
    .from('shops')
    .select('line_channel_id')
    .eq('line_liff_id', liffId)
    .maybeSingle()

  const channelId = shop?.line_channel_id ?? process.env.LINE_LOGIN_CHANNEL_ID
  if (!channelId) {
    return NextResponse.json({ error: 'channel_id not configured' }, { status: 500 })
  }

  // verify idToken
  const verified = await verifyLineIdToken(idToken, channelId)
  if (!verified) {
    return NextResponse.json({ error: 'ตรวจสอบ LINE token ไม่ผ่าน' }, { status: 401 })
  }

  // หา admin_user จาก line_user_id
  let { data: admin } = await supabase
    .from('admin_users')
    .select(`
      id, role, is_active,
      shop_admins ( shop_id, shops ( id, is_active ) )
    `)
    .eq('line_user_id', verified.sub)
    .maybeSingle()

  // ถ้ายังไม่มี → ตรวจสอบว่าควรสร้างไหม
  // (ตอนนี้: ไม่ auto-create — admin ต้องถูกเพิ่มจาก super admin ก่อน)
  if (!admin) {
    return NextResponse.json({
      error: 'คุณไม่ได้รับสิทธิ์ admin',
      lineUserId: verified.sub,   // ส่ง userId ให้ super admin เพิ่มได้
      displayName: displayName ?? '',
    }, { status: 403 })
  }

  if (!admin.is_active) {
    return NextResponse.json({ error: 'บัญชีถูกระงับ' }, { status: 403 })
  }

  // update displayName (อาจเปลี่ยนใน LINE)
  await supabase.from('admin_users')
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq('id', admin.id)

  // หา shop แรกที่ admin คนนี้เป็น (เลือก default)
  const activeShops = (admin.shop_admins ?? []).filter((sa: any) => sa.shops?.is_active)
  const defaultShopId = activeShops[0]?.shop_id ?? null

  // set session
  await setAdminSession(admin.id, defaultShopId)

  return NextResponse.json({
    ok: true,
    shopsCount: activeShops.length,
    redirectTo: '/admin',
  })
}
