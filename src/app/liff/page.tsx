import { LiffGate } from './LiffGate'

type Props = {
  searchParams: Promise<{ next?: string }>
}

export default async function LiffPage({ searchParams }: Props) {
  const { next } = await searchParams
  // ถ้ามาจาก redirect ของ middleware จะมี ?next=/branch/xxx
  // ถ้าไม่มี ให้ไปหน้า /branch (เลือกสาขา) เป็น default
  const redirectTo = next ?? '/branch'

  // ดึง LIFF ID จาก env (default shop)
  // ถ้าต้องการ multi-shop ต้องเปลี่ยนเป็น dynamic จาก subdomain หรือ path
  const liffId = process.env.NEXT_PUBLIC_DEFAULT_LIFF_ID ?? ''

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <LiffGate liffId={liffId} redirectTo={redirectTo} />
    </main>
  )
}
