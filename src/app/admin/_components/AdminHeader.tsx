'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Shop = { id: string; name: string; role: 'owner' | 'staff' }

type Props = {
  displayName: string
  role: string
  shops: Shop[]
  currentShopId: string
  currentShopName: string
}

export function AdminHeader({ displayName, role, shops, currentShopId, currentShopName }: Props) {
  const router = useRouter()
  const [open, setOpen]     = useState(false)
  const [switching, setSwitching] = useState(false)

  const hasMultipleShops = shops.length > 1

  async function switchShop(shopId: string) {
    if (shopId === currentShopId) {
      setOpen(false)
      return
    }
    setSwitching(true)
    try {
      const res = await fetch('/api/admin/switch-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId }),
      })
      if (res.ok) {
        window.location.href = '/admin'
      } else {
        alert('สลับร้านไม่สำเร็จ')
        setSwitching(false)
      }
    } catch {
      setSwitching(false)
    }
  }

  async function logout() {
    if (!confirm('ออกจากระบบ?')) return
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin-login')
  }

  return (
    <header className="border-b border-gray-800 px-5 py-5 sticky top-0 z-10 bg-black">
      <div className="flex items-center justify-between">
        {/* Left: shop switcher */}
        <button
          onClick={() => hasMultipleShops && setOpen(true)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="text-xs text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            {currentShopName}
            {hasMultipleShops && <span className="text-gray-600">▾</span>}
          </div>
          <h1 className="text-2xl font-bold mt-1">Dashboard</h1>
        </button>

        {/* Right: user menu */}
        <button onClick={logout} className="ml-3 text-right flex-shrink-0">
          <div className="text-xs text-gray-500">{displayName}</div>
          <div className="text-xs text-gray-600 mt-0.5">ออกจากระบบ ↗</div>
        </button>
      </div>

      {/* Shop Switcher Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">เลือกร้านที่จะดูแล</h3>
              <p className="text-xs text-zinc-500 mt-1">คุณเป็นแอดมินของ {shops.length} ร้าน</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {shops.map(s => (
                <button key={s.id} onClick={() => switchShop(s.id)}
                  disabled={switching}
                  className={`w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800 transition disabled:opacity-50 ${
                    s.id === currentShopId ? 'bg-zinc-800' : ''
                  }`}>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">{s.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {s.role === 'owner' ? 'เจ้าของ' : 'พนักงาน'}
                    </div>
                  </div>
                  {s.id === currentShopId && <span className="text-emerald-400 text-lg">✓</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setOpen(false)} disabled={switching}
              className="w-full py-4 border-t border-zinc-800 text-sm text-zinc-500 hover:text-white transition">
              ปิด
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
