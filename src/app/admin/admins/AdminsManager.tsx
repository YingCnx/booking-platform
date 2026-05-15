'use client'

import { useState } from 'react'

type ShopAdmin = {
  id: string
  role: 'owner' | 'staff'
  created_at: string
  admin_users: {
    id: string
    line_user_id: string
    display_name: string
    is_active: boolean
  }
}

export function AdminsManager({ initial }: { initial: ShopAdmin[] }) {
  const [list, setList] = useState<ShopAdmin[]>(initial)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ lineUserId: '', displayName: '', role: 'staff' as 'owner' | 'staff' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function add() {
    if (!form.lineUserId.trim()) {
      setError('กรุณากรอก LINE User ID')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/manage-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'เพิ่มไม่สำเร็จ')
        return
      }
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`ลบ ${name} ออกจาก admin?`)) return
    const res = await fetch(`/api/admin/manage-admins?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setList(prev => prev.filter(a => a.id !== id))
    }
  }

  return (
    <div className="space-y-4">

      <div className="bg-amber-950/20 border border-amber-800 rounded-xl p-4 text-sm text-amber-300">
        <div className="font-semibold mb-1">วิธีหา LINE User ID</div>
        <div className="text-xs text-amber-400 leading-relaxed">
          ให้ admin คนนั้น เปิด <code className="bg-amber-950 px-1 rounded">/admin-login</code> ผ่าน LINE
          จะเห็น User ID ของตัวเอง คัดลอกมาแล้วเอามาใส่ในฟอร์มนี้
        </div>
      </div>

      <div className="space-y-2">
        {list.map(sa => (
          <div key={sa.id} className="border border-gray-800 bg-gray-900 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{sa.admin_users?.display_name || 'ไม่ระบุชื่อ'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    sa.role === 'owner'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-gray-800 text-gray-400'
                  }`}>
                    {sa.role === 'owner' ? 'เจ้าของ' : 'พนักงาน'}
                  </span>
                  {!sa.admin_users?.is_active && (
                    <span className="text-xs bg-red-950 text-red-400 px-2 py-0.5 rounded-full">ระงับ</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 font-mono mt-1.5 break-all">
                  {sa.admin_users?.line_user_id}
                </div>
              </div>
              <button onClick={() => remove(sa.id, sa.admin_users?.display_name || 'admin')}
                className="flex-shrink-0 px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:border-red-800 hover:text-red-400 transition">
                ลบ
              </button>
            </div>
          </div>
        ))}

        {list.length === 0 && (
          <div className="text-center py-12 text-gray-600 text-sm">
            ยังไม่มี admin
          </div>
        )}
      </div>

      {adding ? (
        <div className="border border-gray-700 bg-gray-900 rounded-xl p-5 space-y-3">
          <div className="text-sm font-semibold text-gray-300">เพิ่ม admin</div>
          <input type="text" value={form.lineUserId}
            onChange={e => setForm({ ...form, lineUserId: e.target.value.trim() })}
            placeholder="LINE User ID (Uxxxxxxxx...)"
            className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-400" />
          <input type="text" value={form.displayName}
            onChange={e => setForm({ ...form, displayName: e.target.value })}
            placeholder="ชื่อที่แสดง (ไม่บังคับ)"
            className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-400" />
          <select value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value as any })}
            className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white">
            <option value="staff">พนักงาน (Staff)</option>
            <option value="owner">เจ้าของ (Owner)</option>
          </select>
          {error && (
            <div className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={add} disabled={loading}
              className="flex-1 py-2.5 bg-white text-black text-sm font-bold rounded-xl disabled:opacity-50">
              {loading ? 'กำลังเพิ่ม...' : 'เพิ่ม'}
            </button>
            <button onClick={() => { setAdding(false); setError('') }}
              className="px-5 py-2.5 border border-gray-700 text-gray-400 text-sm rounded-xl">ยกเลิก</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-3 border border-dashed border-gray-700 text-gray-500 text-sm rounded-xl hover:border-gray-500 hover:text-gray-300 transition">
          + เพิ่ม admin
        </button>
      )}
    </div>
  )
}
