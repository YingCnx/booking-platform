import { AdminLoginGate } from './AdminLoginGate'

export default function AdminLoginPage() {
  const liffId = process.env.NEXT_PUBLIC_ADMIN_LIFF_ID ?? process.env.NEXT_PUBLIC_DEFAULT_LIFF_ID ?? ''

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <AdminLoginGate liffId={liffId} />
    </main>
  )
}
