import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// LINE channel id ที่ใช้ verify idToken
// ใช้ env แทน DB เพราะ session API ยังไม่รู้ shopId
const LINE_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID ?? ''

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
  const { idToken, displayName, pictureUrl } = await req.json()

  if (!idToken) {
    return NextResponse.json(
      { message: 'idToken required' },
      { status: 400 }
    )
  }

  if (!LINE_CHANNEL_ID) {
    return NextResponse.json(
      { message: 'LINE_LOGIN_CHANNEL_ID not configured' },
      { status: 500 }
    )
  }

  // verify idToken
  const verified = await verifyLineIdToken(idToken, LINE_CHANNEL_ID)
  if (!verified) {
    return NextResponse.json(
      { message: 'ตรวจสอบ LINE token ไม่ผ่าน' },
      { status: 401 }
    )
  }

  // เก็บ session ใน cookie
  const sessionData = {
    lineUserId:  verified.sub,
    displayName: displayName ?? '',
    pictureUrl:  pictureUrl ?? '',
  }

  const cookieStore = await cookies()
  cookieStore.set('line_session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7,  // 7 days
    path:     '/',
  })

  return NextResponse.json({ ok: true })
}
