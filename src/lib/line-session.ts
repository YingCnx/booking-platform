import { cookies } from 'next/headers'

export type LineSession = {
  lineUserId: string
  displayName: string
  pictureUrl: string
}

// อ่าน LINE session จาก cookie (server component / API route)
export async function getLineSession(): Promise<LineSession | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get('line_session')?.value
    if (!raw) return null
    return JSON.parse(raw) as LineSession
  } catch {
    return null
  }
}
