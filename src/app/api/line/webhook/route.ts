import { NextResponse } from 'next/server'
import crypto from 'crypto'

function verifySignature(
  body: string,
  signature: string
): boolean {
  const secret =
    process.env.LINE_CHANNEL_SECRET ?? ''

  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64')

  console.log('=== LINE WEBHOOK VERIFY ===')
  console.log(
    'secret exists:',
    !!secret
  )
  console.log(
    'signature:',
    signature
  )
  console.log(
    'generated hash:',
    hash
  )
  console.log(
    'body length:',
    body.length
  )

  return hash === signature
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()

    const signature =
      req.headers.get('x-line-signature') ?? ''

    // ✅ debug verify
    const verified = verifySignature(
      rawBody,
      signature
    )

    // ❌ ถ้ายัง debug อยู่
    // ให้ bypass ชั่วคราวก่อน
    // เพื่อเช็คว่า route ใช้งานได้ไหม

    if (!verified) {
      console.error(
        '❌ Invalid signature'
      )

      return NextResponse.json(
        {
          error: 'Invalid signature',
        },
        {
          status: 401,
        }
      )
    }

    console.log(
      '✅ Signature verified'
    )

    const body = JSON.parse(rawBody)

    const events =
      body.events ?? []

    for (const event of events) {
      const sourceType =
        event.source?.type

      const userId =
        event.source?.userId

      const groupId =
        event.source?.groupId

      console.log('LINE event:', {
        type: event.type,
        source: sourceType,
        userId: userId ?? '-',
        groupId: groupId ?? '-',
      })
    }

    return NextResponse.json({
      ok: true,
    })
  } catch (err) {
    console.error(
      'Webhook error:',
      err
    )

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      {
        status: 500,
      }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
  })
}