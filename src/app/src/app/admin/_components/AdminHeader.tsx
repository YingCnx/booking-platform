'use client'

import { useRouter } from 'next/navigation'

type Props = {
  displayName: string
  shopName:    string
}

export function AdminHeader({ displayName, shopName }: Props) {
  const router = useRouter()

  async function logout() {
    if (!confirm('ออกจากระบบ?')) return
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin-login')
  }

  return (
    <header className="border-b border-gray-800 px-5 py-5 sticky top-0 z-10 bg-black">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 uppercase tracking-widest truncate">{shopName}</div>
          <h1 className="text-2xl font-bold mt-1">Dashboard</h1>
        </div>
        <button onClick={logout} className="ml-3 text-right flex-shrink-0">
          <div className="text-xs text-gray-500">{displayName}</div>
          <div className="text-xs text-gray-600 mt-0.5">ออกจากระบบ ↗</div>
        </button>
      </div>
    </header>
  )
}
