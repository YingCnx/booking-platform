
import { NextResponse } from 'next/server'
import crypto from 'crypto'

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET ?? ''
  const hash = crypto.createHmac('SHA256', secret).update(body).digest('base64')
  return hash === signature
}

export async function POST(req: Request) {
  const rawBody  = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body   = JSON.parse(rawBody)
  const events = body.events ?? []

  for (const event of events) {
    const sourceType = event.source?.type   // 'user' | 'group' | 'room'
    const userId     = event.source?.userId
    const groupId    = event.source?.groupId

    // ✅ log ทั้ง user ID และ group ID เพื่อให้ admin copy ไปใส่ env
    console.log('LINE event:', {
      type:      event.type,
      source:    sourceType,
      userId:    userId    ?? '-',
      groupId:   groupId   ?? '-',   // ← ต้องการตัวนี้สำหรับ LINE_ADMIN_GROUP_ID
    })
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
