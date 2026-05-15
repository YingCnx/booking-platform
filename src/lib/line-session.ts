import { cookies } from 'next/headers'

export type LineSession = {
  lineUserId:  string
  displayName: string
  pictureUrl:  string
  shopId:      string   // ✅ ใหม่ — รู้ว่าลูกค้ามาจากร้านไหน
}

export async function getLineSession(): Promise<LineSession | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get('line_session')?.value
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LineSession>
    if (!parsed.lineUserId || !parsed.shopId) return null
    return {
      lineUserId:  parsed.lineUserId,
      displayName: parsed.displayName ?? '',
      pictureUrl:  parsed.pictureUrl ?? '',
      shopId:      parsed.shopId,
    }
  } catch {
    return null
  }
}
