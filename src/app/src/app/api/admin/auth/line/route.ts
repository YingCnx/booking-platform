import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { setAdminSession } from '@/lib/admin-session'
import { getShopLineCredentials } from '@/lib/line'

// ============================================
// Verify admin: check if userId is in groupId
// ============================================

async function checkGroupMembership(
  groupId: string,
  userId: string,
  accessToken: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.line.me/v2/bot/group/${groupId}/member/${userId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    return res.ok
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const { lineUserId, displayName, groupId } = await req.json()

  if (!lineUserId || !groupId) {
    return NextResponse.json(
      { error: 'lineUserId และ groupId required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // 1. หา shop จาก groupId
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, line_admin_group_id, is_active')
    .eq('line_admin_group_id', groupId)
    .eq('is_active', true)
    .maybeSingle()

  if (!shop) {
    return NextResponse.json(
      { error: 'ไม่พบร้านที่ตรงกับกลุ่มนี้' },
      { status: 404 }
    )
  }

  // 2. ดึง access token ของร้าน
  const creds = await getShopLineCredentials(shop.id)
  if (!creds.accessToken) {
    return NextResponse.json(
      { error: 'ร้านยังไม่ได้ตั้งค่า LINE' },
      { status: 500 }
    )
  }

  // 3. เรียก LINE API เช็คว่า userId อยู่ในกลุ่มจริงไหม
  const isMember = await checkGroupMembership(groupId, lineUserId, creds.accessToken)
  if (!isMember) {
    return NextResponse.json(
      { error: 'คุณไม่ได้อยู่ในกลุ่ม admin ของร้านนี้' },
      { status: 403 }
    )
  }

  // 4. set session
  await setAdminSession({
    lineUserId,
    displayName: displayName ?? '',
    shopId:      shop.id,
    shopName:    shop.name,
    groupId,
  })

  return NextResponse.json({ ok: true, shopId: shop.id, shopName: shop.name })
}
