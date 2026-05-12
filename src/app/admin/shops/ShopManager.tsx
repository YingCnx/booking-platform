'use client'

import { useState } from 'react'

type Shop = {
  id: string
  name: string
  slug: string
  phone: string | null
  is_active: boolean
  line_channel_id: string | null
  line_admin_group_id: string | null
  line_liff_id: string | null
  branches: { id: string; name: string }[]
}

export function ShopManager({ initialShops }: { initialShops: Shop[] }) {
  const [shops, setShops] = useState<Shop[]>(initialShops)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const emptyForm = {
    name: '', slug: '', phone: '',
    line_channel_id: '', line_channel_secret: '',
    line_access_token: '', line_admin_group_id: '', line_liff_id: '',
  }
  const [form, setForm] = useState(emptyForm)

  function set(key: string, val: string) {
    setForm(p => ({ ...p, [key]: val }))
  }

  function startEdit(s: Shop) {
    setEditing(s.id)
    setAdding(false)
    setForm({ name: s.name, slug: s.slug, phone: s.phone ?? '',
      line_channel_id: s.line_channel_id ?? '',
      line_channel_secret: '', line_access_token: '',
      line_admin_group_id: s.line_admin_group_id ?? '',
      line_liff_id: s.line_liff_id ?? '',
    })
    setError('')
  }

  function cancel() { setAdding(false); setEditing(null); setForm(emptyForm); setError('') }

  async function saveNew() {
    setLoading('add'); setError('')
    try {
      const res = await fetch('/api/admin/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'เกิดข้อผิดพลาด'); return }
      setShops(p => [...p, { ...data.shop, branches: [] }])
      cancel()
    } finally { setLoading(null) }
  }

  async function saveEdit(id: string) {
    setLoading(id); setError('')
    try {
      const res = await fetch('/api/admin/shops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'เกิดข้อผิดพลาด'); return }
      setShops(p => p.map(s => s.id === id ? { ...data.shop, branches: s.branches } : s))
      cancel()
    } finally { setLoading(null) }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-xl px-4 py-3">{error}</div>
      )}

      {shops.map(s => (
        <div key={s.id}>
          {editing === s.id ? (
            <div className="border border-gray-700 bg-gray-900 rounded-xl p-5 space-y-4">
              <div className="text-sm font-semibold text-gray-300">แก้ไข {s.name}</div>
              <ShopForm form={form} set={set} isEdit />
              <div className="flex gap-2">
                <button onClick={() => saveEdit(s.id)} disabled={loading === s.id}
                  className="flex-1 py-2.5 bg-white text-black text-sm font-semibold rounded-xl disabled:opacity-50">
                  {loading === s.id ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button onClick={cancel} className="px-5 py-2.5 border border-gray-700 text-gray-400 text-sm rounded-xl">ยกเลิก</button>
              </div>
            </div>
          ) : (
            <div className={`border rounded-xl p-5 ${s.is_active ? 'border-gray-800 bg-gray-900' : 'border-gray-800 bg-gray-950 opacity-60'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-xs text-gray-500 font-mono">/{s.slug}</span>
                    {!s.is_active && <span className="text-xs border border-gray-700 text-gray-600 px-2 py-0.5 rounded-full">ปิด</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-1.5 space-y-0.5">
                    {s.phone && <div>📞 {s.phone}</div>}
                    <div className={s.line_channel_id ? 'text-green-600' : 'text-amber-600'}>
                      {s.line_channel_id ? '✓ LINE ตั้งค่าแล้ว' : '⚠ ยังไม่ตั้งค่า LINE'}
                    </div>
                    <div className="text-gray-600">{s.branches?.length ?? 0} สาขา</div>
                  </div>
                </div>
                <button onClick={() => startEdit(s)}
                  className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:text-white hover:border-gray-500 transition flex-shrink-0">
                  แก้ไข
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <div className="border border-gray-700 bg-gray-900 rounded-xl p-5 space-y-4">
          <div className="text-sm font-semibold text-gray-300">เพิ่มร้านใหม่</div>
          <ShopForm form={form} set={set} />
          <div className="flex gap-2">
            <button onClick={saveNew} disabled={loading === 'add'}
              className="flex-1 py-2.5 bg-white text-black text-sm font-semibold rounded-xl disabled:opacity-50">
              {loading === 'add' ? 'กำลังบันทึก...' : 'เพิ่มร้าน'}
            </button>
            <button onClick={cancel} className="px-5 py-2.5 border border-gray-700 text-gray-400 text-sm rounded-xl">ยกเลิก</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAdding(true); setEditing(null); setForm(emptyForm); setError('') }}
          className="w-full py-3 border border-dashed border-gray-700 text-gray-500 text-sm rounded-xl hover:border-gray-500 hover:text-gray-300 transition">
          + เพิ่มร้านใหม่
        </button>
      )}
    </div>
  )
}

function ShopForm({ form, set, isEdit }: {
  form: any; set: (k: string, v: string) => void; isEdit?: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">ชื่อร้าน *</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Nail Studio A"
            className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Slug * (URL)</label>
          <input type="text" value={form.slug} onChange={e => set('slug', e.target.value)}
            placeholder="nail-studio-a" disabled={isEdit}
            className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-500 disabled:opacity-40" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">เบอร์โทร</label>
        <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
          placeholder="0812345678"
          className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-500" />
      </div>

      <div className="border-t border-gray-800 pt-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">LINE Settings</div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Channel ID</label>
              <input type="text" value={form.line_channel_id} onChange={e => set('line_channel_id', e.target.value)}
                placeholder="2006xxxxxx"
                className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">LIFF ID</label>
              <input type="text" value={form.line_liff_id} onChange={e => set('line_liff_id', e.target.value)}
                placeholder="2006xxxxxx-xxxxxxxx"
                className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-500" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Channel Secret</label>
            <input type="password" value={form.line_channel_secret} onChange={e => set('line_channel_secret', e.target.value)}
              placeholder={isEdit ? '(เว้นว่างถ้าไม่ต้องการเปลี่ยน)' : 'Channel secret'}
              className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Channel Access Token</label>
            <input type="password" value={form.line_access_token} onChange={e => set('line_access_token', e.target.value)}
              placeholder={isEdit ? '(เว้นว่างถ้าไม่ต้องการเปลี่ยน)' : 'Access token'}
              className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Admin Group ID</label>
            <input type="text" value={form.line_admin_group_id} onChange={e => set('line_admin_group_id', e.target.value)}
              placeholder="Cxxxxxxxxxxxxxxxxx"
              className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-500" />
          </div>
        </div>
      </div>
    </div>
  )
}
