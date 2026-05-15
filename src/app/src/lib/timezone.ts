// ===========================================
// Timezone helpers (Asia/Bangkok)
// ===========================================

const TZ = 'Asia/Bangkok'

// ได้ Date object ที่แทนเวลา "ตอนนี้ที่ไทย"
export function nowInBangkok(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: TZ })
  )
}

// ได้ string YYYY-MM-DD ของ "วันนี้ตามเวลาไทย"
export function todayInBangkok(): string {
  const now = nowInBangkok()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// แปลง Date เป็น YYYY-MM-DD
export function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ได้ minutes-of-day ของเวลาไทยตอนนี้
export function currentMinutesInBangkok(): number {
  const now = nowInBangkok()
  return now.getHours() * 60 + now.getMinutes()
}

// สร้าง list วันที่ N วันข้างหน้า (เริ่มจากวันนี้)
export function generateDates(count = 7): string[] {
  const today = nowInBangkok()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return toDateString(d)
  })
}
