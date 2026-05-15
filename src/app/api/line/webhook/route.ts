import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function verifySignature(body: string, signature: string) {
  const secret = process.env.LINE_CHANNEL_SECRET ?? ''

  console.log('LINE_CHANNEL_SECRET =', secret)

  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64')

  console.log('===== LINE VERIFY =====')
  console.log('signature =', signature)
  console.log('hash      =', hash)
  console.log('body      =', body)

  return hash === signature
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    const signature =
      req.headers.get('x-line-signature') ?? ''

    const isValid = verifySignature(
      rawBody,
      signature
    )

    if (!isValid) {
      console.log('❌ INVALID SIGNATURE')

      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid signature',
        },
        { status: 401 }
      )
    }

    console.log('✅ SIGNATURE VERIFIED')

    const body = JSON.parse(rawBody)

    const events = body.events ?? []

    for (const event of events) {
      const sourceType = event.source?.type
      const userId = event.source?.userId
      const groupId = event.source?.groupId

      console.log('===== LINE EVENT =====')

      console.log({
        type: event.type,
        sourceType,
        userId: userId ?? '-',
        groupId: groupId ?? '-',
      })
    }

    return NextResponse.json({
      ok: true,
    })
  } catch (err) {
    console.error('WEBHOOK ERROR:', err)

    return NextResponse.json(
      {
        ok: false,
        error: 'Server error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
  })
}