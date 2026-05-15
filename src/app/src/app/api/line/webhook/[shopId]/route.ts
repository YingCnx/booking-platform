import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hash = crypto.createHmac('SHA256', secret).update(body).digest('base64')
  return hash === signature
}

type Props = {
  params: Promise<{ shopId: string }>
}

export async function POST(req: Request, { params }: Props) {
  const { shopId } = await params
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  // ✅ ดึง channel_secret ของร้านนี้จาก DB
  const supabase = await createClient()
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, line_channel_secret')
    .eq('id', shopId)
    .eq('is_active', true)
    .maybeSingle()

  if (!shop) {
    console.error('[webhook]', shopId, 'shop not found')
    return NextResponse.json({ error: 'shop not found' }, { status: 404 })
  }

  if (!shop.line_channel_secret) {
    console.error('[webhook]', shopId, 'channel_secret not configured')
    return NextResponse.json({ error: 'channel_secret not set' }, { status: 500 })
  }

  // ✅ verify ด้วย secret ของร้านนี้
  if (!verifySignature(rawBody, signature, shop.line_channel_secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body = JSON.parse(rawBody)
  const events = body.events ?? []

  for (const event of events) {
    const sourceType = event.source?.type
    const userId     = event.source?.userId
    const groupId    = event.source?.groupId

    // ✅ log: ทำให้ admin copy group ID ได้ง่ายตอน setup ร้านใหม่
    console.log(`[webhook ${shop.name}]`, {
      type:    event.type,
      source:  sourceType,
      userId:  userId  ?? '-',
      groupId: groupId ?? '-',
    })

    // เพิ่ม event handler ที่นี่ในอนาคต
    // (เช่น auto-reply, customer link, ฯลฯ)
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
