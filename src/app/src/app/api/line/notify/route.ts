import { NextResponse } from 'next/server'
import {
  getShopLineCredentials,
  pushMessage,
  buildBookingPendingFlex,
  buildBookingConfirmedFlex,
  buildAdminNotifyFlex,
  buildReminderFlex,
} from '@/lib/line'

export async function POST(req: Request) {
  const { type, data, shopId } = await req.json()

  if (!shopId) {
    return NextResponse.json({ error: 'shopId required' }, { status: 400 })
  }

  // ✅ ดึง LINE credentials ของร้านนั้น
  const creds = await getShopLineCredentials(shopId)

  if (!creds.accessToken) {
    return NextResponse.json({ error: 'LINE not configured for this shop' }, { status: 400 })
  }

  try {
    if (type === 'booking_pending') {
      // แจ้งลูกค้า
      if (data.lineUserId) {
        await pushMessage(data.lineUserId, [buildBookingPendingFlex(data)], creds.accessToken)
      }
      // แจ้ง admin group ของร้านนั้น
      if (creds.adminGroupId) {
        await pushMessage(creds.adminGroupId, [buildAdminNotifyFlex({ ...data, adminGroupId: creds.adminGroupId })], creds.accessToken)
      }
    }

    if (type === 'booking_confirmed') {
      if (data.lineUserId) {
        await pushMessage(data.lineUserId, [buildBookingConfirmedFlex(data)], creds.accessToken)
      }
    }

    if (type === 'reminder') {
      if (data.lineUserId) {
        await pushMessage(data.lineUserId, [buildReminderFlex(data)], creds.accessToken)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('LINE notify error:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
