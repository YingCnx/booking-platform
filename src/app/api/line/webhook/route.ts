import { NextResponse } from 'next/server'

// Legacy webhook endpoint — ไม่ใช้แล้ว
// ทุกร้านควรตั้ง webhook URL เป็น /api/line/webhook/[shopId]

export async function POST() {
  return NextResponse.json(
    {
      error: 'Webhook endpoint deprecated',
      message: 'กรุณาตั้งค่า webhook URL ใหม่: /api/line/webhook/[shopId]',
    },
    { status: 410 }
  )
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Use /api/line/webhook/[shopId]' })
}
