// ==============================================
// LINE Webhook — รับ events จาก LINE Platform
// ==============================================

import { NextResponse } from 'next/server'
import crypto from 'crypto'

// verify ว่า request มาจาก LINE จริง
function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET ?? ''
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64')
  return hash === signature
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  // ✅ verify signature ก่อนเสมอ
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body = JSON.parse(rawBody)
  const events = body.events ?? []

  for (const event of events) {
    // ตอนนี้ webhook รับ event มาเก็บ log ไว้
    // สามารถ extend เพิ่ม logic ได้ เช่น ตอบ chatbot
    console.log('LINE event:', event.type, event.source?.userId)
  }

  return NextResponse.json({ ok: true })
}

// LINE ส่ง GET มา verify endpoint
export async function GET() {
  return NextResponse.json({ ok: true })
}
