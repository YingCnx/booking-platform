import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

async function verifyLineIdToken(
  idToken: string,
  channelId: string
): Promise<{ sub: string } | null> {
  try {
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('[liff/session] verify failed:', err)
      return null
    }
    return await res.json()
  } catch (err) {
    console.error('[liff/session] verify exception:', err)
    return null
  }
}

export async function POST(req: Request) {
  const { idToken, displayName, pictureUrl, liffId } = await req.json()

  if (!idToken) {
    return NextResponse.json({ message: 'idToken required' }, { status: 400 })
  }

  if (!liffId) {
    return NextResponse.json({ message: 'liffId required' }, { status: 400 })
  }

  // ✅ หา shop จาก liffId — เพื่อรู้ว่าลูกค้ามาจากร้านไหน
  const supabase = await createClient()
  const { data: shop } = await supabase
    .from('shops')
    .select('id, line_channel_id')
    .eq('line_liff_id', liffId)
    .eq('is_active', true)
    .maybeSingle()

  if (!shop) {
    return NextResponse.json({ message: 'ไม่พบร้านที่ตรงกับ LIFF นี้' }, { status: 404 })
  }

  // ✅ verify idToken ด้วย channel_id ของร้านนั้น
  const channelId = shop.line_channel_id ?? process.env.LINE_LOGIN_CHANNEL_ID
  console.log(channelId)
  
  if (!channelId) {
    return NextResponse.json({ message: 'ร้านยังไม่ได้ตั้งค่า channel_id' }, { status: 500 })
  }

  const verified = await verifyLineIdToken(idToken, channelId)
  if (!verified) {
    return NextResponse.json({ message: 'ตรวจสอบ LINE token ไม่ผ่าน' }, { status: 401 })
  }

  // ✅ เก็บ shop_id ลงใน session ด้วย
  const sessionData = {
    lineUserId:  verified.sub,
    displayName: displayName ?? '',
    pictureUrl:  pictureUrl ?? '',
    shopId:      shop.id,
  }

  const cookieStore = await cookies()
  cookieStore.set('line_session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7,
    path:     '/',
  })

  return NextResponse.json({ ok: true, shopId: shop.id })
}
