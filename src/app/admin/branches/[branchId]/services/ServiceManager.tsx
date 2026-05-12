'use client'

import { useState } from 'react'

type Service = {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  is_active: boolean
}

type Props = {
  branchId: string
  initialServices: Service[]
}

export function ServiceManager({ branchId, initialServices }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices)
  const [editing, setEditing]   = useState<string | null>(null) // service id ที่กำลังแก้
  const [adding, setAdding]     = useState(false)
  const [loading, setLoading]   = useState<string | null>(null)
  const [error, setError]       = useState('')

  // form state
  const emptyForm = { name: '', description: '', duration_minutes: 60, price: 0 }
  const [form, setForm] = useState(emptyForm)

  function startEdit(s: Service) {
    setEditing(s.id)
    setAdding(false)
    setForm({ name: s.name, description: s.description ?? '', duration_minutes: s.duration_minutes, price: s.price })
    setError('')
  }

  function startAdd() {
    setAdding(true)
    setEditing(null)
    setForm(emptyForm)
    setError('')
  }

  function cancel() {
    setEditing(null)
    setAdding(false)
    setForm(emptyForm)
    setError('')
  }

  async function saveNew() {
    if (!form.name || !form.duration_minutes || form.price === undefined) {
      setError('กรอกข้อมูลให้ครบ')
      return
    }
    setLoading('add')
    setError('')
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'เกิดข้อผิดพลาด'); return }
      setServices(prev => [...prev, data.service])
      cancel()
    } finally {
      setLoading(null)
    }
  }

  async function saveEdit(id: string) {
    setLoading(id)
    setError('')
    try {
      const res = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'เกิดข้อผิดพลาด'); return }
      setServices(prev => prev.map(s => s.id === id ? data.service : s))
      cancel()
    } finally {
      setLoading(null)
    }
  }

  async function toggleActive(s: Service) {
    setLoading(s.id)
    try {
      const res = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, name: s.name, description: s.description, duration_minutes: s.duration_minutes, price: s.price, is_active: !s.is_active }),
      })
      const data = await res.json()
      if (res.ok) setServices(prev => prev.map(x => x.id === s.id ? data.service : x))
    } finally {
      setLoading(null)
    }
  }

  async function deleteService(id: string) {
    if (!confirm('ลบบริการนี้?')) return
    setLoading(id)
    try {
      const res = await fetch('/api/admin/services', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) setServices(prev => prev.filter(s => s.id !== id))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Service list */}
      <div className="space-y-2">
        {services.map(s => (
          <div key={s.id}>
            {editing === s.id ? (
              /* Edit form */
              <div className="border border-gray-700 bg-gray-900 rounded-xl p-4 space-y-3">
                <ServiceForm form={form} setForm={setForm} />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => saveEdit(s.id)} disabled={loading === s.id}
                    className="flex-1 py-2.5 bg-white text-black text-sm font-semibold rounded-xl disabled:opacity-50">
                    {loading === s.id ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                  <button onClick={cancel} className="px-4 py-2.5 border border-gray-700 text-gray-400 text-sm rounded-xl hover:text-white transition">
                    ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              /* Service card */
              <div className={`border rounded-xl px-4 py-3.5 flex items-center gap-3 ${s.is_active ? 'border-gray-800 bg-gray-900' : 'border-gray-800 bg-gray-950 opacity-50'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{s.name}</span>
                    {!s.is_active && <span className="text-xs text-gray-600 border border-gray-700 px-2 py-0.5 rounded-full">ปิด</span>}
                  </div>
                  {s.description && <div className="text-xs text-gray-500 mt-0.5 truncate">{s.description}</div>}
                  <div className="text-xs text-gray-500 mt-1">
                    ⏱ {s.duration_minutes} นาที · <span className="text-white font-medium">฿{s.price}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(s)} disabled={!!loading}
                    className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:text-white hover:border-gray-500 transition">
                    แก้ไข
                  </button>
                  <button onClick={() => toggleActive(s)} disabled={loading === s.id}
                    className={`px-3 py-1.5 text-xs border rounded-lg transition ${s.is_active ? 'border-gray-700 text-gray-500 hover:text-amber-400 hover:border-amber-700' : 'border-green-800 text-green-500 hover:bg-green-950'}`}>
                    {s.is_active ? 'ปิด' : 'เปิด'}
                  </button>
                  <button onClick={() => deleteService(s.id)} disabled={!!loading}
                    className="px-3 py-1.5 text-xs border border-gray-700 text-gray-600 rounded-lg hover:text-red-400 hover:border-red-800 transition">
                    ลบ
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {services.length === 0 && !adding && (
          <div className="border border-gray-800 bg-gray-900 rounded-xl px-5 py-8 text-center text-gray-600 text-sm">
            ยังไม่มีบริการ กด + เพิ่มบริการได้เลย
          </div>
        )}
      </div>

      {/* Add form */}
      {adding ? (
        <div className="border border-gray-700 bg-gray-900 rounded-xl p-4 space-y-3">
          <div className="text-sm font-semibold text-gray-300 mb-1">เพิ่มบริการใหม่</div>
          <ServiceForm form={form} setForm={setForm} />
          <div className="flex gap-2 pt-1">
            <button onClick={saveNew} disabled={loading === 'add'}
              className="flex-1 py-2.5 bg-white text-black text-sm font-semibold rounded-xl disabled:opacity-50">
              {loading === 'add' ? 'กำลังบันทึก...' : 'เพิ่มบริการ'}
            </button>
            <button onClick={cancel} className="px-4 py-2.5 border border-gray-700 text-gray-400 text-sm rounded-xl hover:text-white transition">
              ยกเลิก
            </button>
          </div>
        </div>
      ) : (
        <button onClick={startAdd}
          className="w-full py-3 border border-dashed border-gray-700 text-gray-500 text-sm rounded-xl hover:border-gray-500 hover:text-gray-300 transition">
          + เพิ่มบริการ
        </button>
      )}

    </div>
  )
}

function ServiceForm({ form, setForm }: {
  form: { name: string; description: string; duration_minutes: number; price: number }
  setForm: (f: any) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">ชื่อบริการ *</label>
        <input type="text" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))}
          placeholder="เช่น Gel Nails, Deep Clean"
          className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-500" />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">รายละเอียด (ไม่บังคับ)</label>
        <input type="text" value={form.description} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))}
          placeholder="อธิบายบริการสั้นๆ"
          className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-500" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">ระยะเวลา (นาที) *</label>
          <input type="number" value={form.duration_minutes} min={15} step={15}
            onChange={e => setForm((p: any) => ({ ...p, duration_minutes: Number(e.target.value) }))}
            className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gray-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">ราคา (฿) *</label>
          <input type="number" value={form.price} min={0}
            onChange={e => setForm((p: any) => ({ ...p, price: Number(e.target.value) }))}
            className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gray-500" />
        </div>
      </div>
    </div>
  )
}
