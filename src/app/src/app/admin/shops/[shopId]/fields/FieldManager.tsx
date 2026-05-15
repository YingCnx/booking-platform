'use client'

import { useState } from 'react'
import type { FieldDef, FieldSchema, FieldType } from '@/lib/field-schema'
import { FIELD_PRESETS, SYSTEM_FIELD_KEYS } from '@/lib/field-schema'

type Props = {
  shopId: string
  initialSchema: FieldSchema
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text:     'ข้อความ',
  phone:    'เบอร์โทร',
  textarea: 'ข้อความหลายบรรทัด',
  number:   'ตัวเลข',
  select:   'ตัวเลือก',
}

export function FieldManager({ shopId, initialSchema }: Props) {
  const [fields, setFields] = useState<FieldDef[]>(initialSchema.fields)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')
  const [adding, setAdding] = useState(false)
  const [newField, setNewField] = useState<FieldDef>({
    key: '', label: '', type: 'text', required: true, enabled: true, placeholder: '',
  })

  function toggleEnabled(i: number) {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, enabled: !f.enabled } : f))
  }
  function toggleRequired(i: number) {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, required: !f.required } : f))
  }
  function updateField(i: number, patch: Partial<FieldDef>) {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f))
  }
  function deleteField(i: number) {
    if (!confirm('ลบ field นี้?')) return
    setFields(prev => prev.filter((_, idx) => idx !== i))
  }
  function addField() {
    if (!newField.key || !newField.label) {
      setError('กรุณากรอก key และ label')
      return
    }
    if (fields.some(f => f.key === newField.key)) {
      setError('key นี้มีอยู่แล้ว')
      return
    }
    setFields(prev => [...prev, newField])
    setNewField({ key: '', label: '', type: 'text', required: true, enabled: true, placeholder: '' })
    setAdding(false)
    setError('')
  }

  function loadPreset(preset: 'nail' | 'shoe_wash') {
    if (!confirm(`โหลด preset ${preset}? จะเขียนทับ field ปัจจุบัน`)) return
    setFields(FIELD_PRESETS[preset].fields)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/shops/${shopId}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'บันทึกไม่สำเร็จ')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* Preset shortcuts */}
      <div className="flex gap-2">
        <button onClick={() => loadPreset('nail')}
          className="flex-1 py-2.5 border border-zinc-700 bg-zinc-900 text-sm text-zinc-300 rounded-xl hover:border-zinc-500 transition">
          🎨 ร้านเล็บ (2 field)
        </button>
        <button onClick={() => loadPreset('shoe_wash')}
          className="flex-1 py-2.5 border border-zinc-700 bg-zinc-900 text-sm text-zinc-300 rounded-xl hover:border-zinc-500 transition">
          👟 ร้านซักรองเท้า (4 field)
        </button>
      </div>

      {/* Field list */}
      <div className="space-y-2">
        {fields.map((f, i) => {
          const isSystem = SYSTEM_FIELD_KEYS.includes(f.key)
          return (
            <div key={f.key} className={`border rounded-2xl p-4 ${f.enabled ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800 bg-zinc-950 opacity-50'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-3">
                  {/* label + key */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={f.label}
                      onChange={e => updateField(i, { label: e.target.value })}
                      placeholder="Label"
                      className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                    />
                    <input
                      type="text"
                      value={f.key}
                      onChange={e => updateField(i, { key: e.target.value })}
                      placeholder="key"
                      disabled={isSystem}
                      className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 disabled:opacity-50"
                    />
                  </div>
                  {/* type + placeholder */}
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={f.type}
                      onChange={e => updateField(i, { type: e.target.value as FieldType })}
                      disabled={isSystem}
                      className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400 disabled:opacity-50"
                    >
                      {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={f.placeholder ?? ''}
                      onChange={e => updateField(i, { placeholder: e.target.value })}
                      placeholder="placeholder"
                      className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                  {/* toggles */}
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={f.enabled} onChange={() => toggleEnabled(i)} className="w-4 h-4" />
                      <span className="text-zinc-300">เปิดใช้</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={f.required} onChange={() => toggleRequired(i)} className="w-4 h-4" />
                      <span className="text-zinc-300">บังคับกรอก</span>
                    </label>
                    {isSystem && <span className="text-zinc-600 ml-auto">system</span>}
                  </div>
                </div>

                {!isSystem && (
                  <button onClick={() => deleteField(i)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs border border-zinc-700 text-zinc-600 rounded-lg hover:text-red-400 hover:border-red-800 transition">
                    ลบ
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add field */}
      {adding ? (
        <div className="border border-zinc-700 bg-zinc-900 rounded-2xl p-4 space-y-3">
          <div className="text-sm font-semibold text-zinc-300">เพิ่ม field ใหม่</div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={newField.label}
              onChange={e => setNewField({ ...newField, label: e.target.value })}
              placeholder="Label เช่น สถานที่รับ"
              className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" />
            <input type="text" value={newField.key}
              onChange={e => setNewField({ ...newField, key: e.target.value.replace(/[^a-z0-9_]/g, '') })}
              placeholder="key เช่น pickup_address"
              className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono" />
          </div>
          <select value={newField.type}
            onChange={e => setNewField({ ...newField, type: e.target.value as FieldType })}
            className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white">
            {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input type="text" value={newField.placeholder ?? ''}
            onChange={e => setNewField({ ...newField, placeholder: e.target.value })}
            placeholder="placeholder"
            className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300" />
          <div className="flex gap-2">
            <button onClick={addField}
              className="flex-1 py-2.5 bg-white text-black text-sm font-bold rounded-xl">เพิ่ม</button>
            <button onClick={() => { setAdding(false); setError('') }}
              className="px-5 py-2.5 border border-zinc-700 text-zinc-400 text-sm rounded-xl">ยกเลิก</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-3 border border-dashed border-zinc-700 text-zinc-500 text-sm rounded-xl hover:border-zinc-500 hover:text-zinc-300 transition">
          + เพิ่ม field
        </button>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {saved && (
        <div className="text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-800 rounded-xl px-4 py-3">
          ✓ บันทึกแล้ว
        </div>
      )}

      <button onClick={save} disabled={saving}
        className="w-full bg-white text-black py-4 rounded-2xl text-base font-bold disabled:opacity-50">
        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
    </div>
  )
}
