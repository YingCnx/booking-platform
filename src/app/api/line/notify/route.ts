// ==============================================
// LINE Notify API — ส่งข้อความหาลูกค้า/admin
// ==============================================

import { NextResponse } from 'next/server'
import { pushMessage, buildBookingPendingFlex, buildBookingConfirmedFlex, buildAdminNotifyFlex, buildReminderFlex } from '@/lib/line'

export async function POST(req: Request) {
  const { type, data } = await req.json()

  // type: 'booking_pending' | 'booking_confirmed' | 'admin_notify' | 'reminder'

  try {
    if (type === 'booking_pending') {
      // แจ้งลูกค้าว่าส่งคำขอสำเร็จ รอยืนยัน
      if (data.lineUserId) {
        await pushMessage(data.lineUserId, [buildBookingPendingFlex(data)])
      }

      // แจ้ง admin ว่ามีจองใหม่
      if (process.env.LINE_ADMIN_USER_ID) {
        await pushMessage(process.env.LINE_ADMIN_USER_ID, [buildAdminNotifyFlex(data)])
      }
    }

    if (type === 'booking_confirmed') {
      // แจ้งลูกค้าว่า confirmed แล้ว
      if (data.lineUserId) {
        await pushMessage(data.lineUserId, [buildBookingConfirmedFlex(data)])
      }
    }

    if (type === 'reminder') {
      // แจ้งเตือนก่อนนัด — เรียกจาก cron job
      if (data.lineUserId) {
        await pushMessage(data.lineUserId, [buildReminderFlex(data)])
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('LINE notify error:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
