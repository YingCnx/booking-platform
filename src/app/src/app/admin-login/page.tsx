import { AdminLoginGate } from './AdminLoginGate'

type Props = {
  searchParams: Promise<{ groupId?: string; next?: string }>
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { groupId, next } = await searchParams
  const liffId = process.env.NEXT_PUBLIC_ADMIN_LIFF_ID
              ?? process.env.NEXT_PUBLIC_DEFAULT_LIFF_ID
              ?? ''

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <AdminLoginGate
        liffId={liffId}
        groupId={groupId ?? ''}
        nextPath={next ?? '/admin'}
      />
    </main>
  )
}
