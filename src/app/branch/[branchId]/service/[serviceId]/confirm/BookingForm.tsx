'use client'

import { useState, useTransition } from 'react'
import { createBooking } from '@/app/actions/create-booking'
import type { FieldDef } from '@/lib/field-schema'

type Props = {
  branchId: string
  serviceId: string
  time: string
  date: string
  fields: FieldDef[]
  defaults?: Record<string, string>
}

export function BookingForm({
  branchId, serviceId, time, date, fields, defaults = {},
}: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    fields.forEach(f => { init[f.key] = defaults[f.key] ?? '' })
    return init
  })
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  function setField(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  function handlePhoneChange(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setField(key, digits)
  }

  function handleNumberChange(key: string, e: React.ChangeEvent<HTMLInputElement>, min?: number, max?: number) {
    let v = e.target.value.replace(/\D/g, '')
    if (max && v.length > String(max).length) v = v.slice(0, String(max).length)
    setField(key, v)
  }

  function validate(): string {
    for (const f of fields) {
      if (!f.required) continue
      const v = (values[f.key] ?? '').trim()
      if (!v) return `กรุณากรอก${f.label}`
      if (f.type === 'phone' && !/^\d{10}$/.test(v)) return `${f.label}ต้อง 10 หลัก`
      if (f.type === 'number') {
        const n = Number(v)
        if (isNaN(n)) return `${f.label}ต้องเป็นตัวเลข`
        if (f.min !== undefined && n < f.min) return `${f.label}อย่างน้อย ${f.min}`
        if (f.max !== undefined && n > f.max) return `${f.label}ไม่เกิน ${f.max}`
      }
    }
    return ''
  }

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setConfirming(true)
  }

  function actuallySubmit() {
    if (pending) return
    startTransition(async () => {
      const formData = new FormData()
      formData.append('branchId',  branchId)
      formData.append('serviceId', serviceId)
      formData.append('time',      time)
      formData.append('date',      date)
      // ✅ ส่งทุก field ที่กรอก
      Object.entries(values).forEach(([k, v]) => {
        formData.append(`field_${k}`, v.trim())
      })
      // ส่ง schema มาด้วย ให้ server รู้ว่า field ไหนคืออะไร
      formData.append('_field_keys', fields.map(f => f.key).join(','))
      formData.append('_field_labels', fields.map(f => f.label).join('|'))
      await createBooking(formData)
    })
  }

  // หาชื่อ + เบอร์ สำหรับแสดงใน confirm dialog
  const displayName  = values.name  ?? ''
  const displayPhone = values.phone ?? ''

  return (
    <>
      <form onSubmit={handleSubmitClick} className="space-y-4">

        {fields.map(field => (
          <FieldInput
            key={field.key}
            field={field}
            value={values[field.key] ?? ''}
            disabled={pending}
            onChange={(e) => {
              if (field.type === 'phone') {
                handlePhoneChange(field.key, e as React.ChangeEvent<HTMLInputElement>)
              } else if (field.type === 'number') {
                handleNumberChange(field.key, e as React.ChangeEvent<HTMLInputElement>, field.min, field.max)
              } else {
                setField(field.key, (e.target as HTMLInputElement | HTMLTextAreaElement).value)
              }
            }}
          />
        ))}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-black py-4 text-base font-bold text-white transition active:scale-[0.99] disabled:opacity-50"
        >
          {pending ? 'กำลังบันทึก...' : 'ส่งคำขอจอง'}
        </button>
      </form>

      {/* Confirm Dialog */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden">
            <div className="px-5 py-5">
              <h3 className="text-lg font-bold text-gray-900">ยืนยันการจอง?</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                ส่งคำขอจองในชื่อ <span className="font-semibold text-gray-900">{displayName}</span>
                {displayPhone && (
                  <><br />เบอร์ <span className="font-semibold text-gray-900">{displayPhone}</span></>
                )}
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl active:bg-gray-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={actuallySubmit}
                disabled={pending}
                className="flex-1 py-3 bg-black text-white text-sm font-bold rounded-xl active:bg-gray-700 disabled:opacity-50"
              >
                {pending ? 'กำลังส่ง...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================
// Field Input — render ตาม type
// ============================================
function FieldInput({
  field, value, disabled, onChange,
}: {
  field: FieldDef
  value: string
  disabled: boolean
  onChange: (e: React.ChangeEvent<any>) => void
}) {
  const baseClass = 'w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none disabled:opacity-50'

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-900">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          rows={3}
          value={value}
          onChange={onChange}
          required={field.required}
          placeholder={field.placeholder}
          disabled={disabled}
          className={`${baseClass} resize-none`}
        />
      ) : field.type === 'phone' ? (
        <>
          <input
            type="tel"
            value={value}
            onChange={onChange}
            required={field.required}
            placeholder={field.placeholder}
            inputMode="numeric"
            maxLength={10}
            disabled={disabled}
            className={baseClass}
          />
          {value.length > 0 && value.length < 10 && (
            <p className="mt-1.5 text-xs text-amber-600">อีก {10 - value.length} หลัก</p>
          )}
        </>
      ) : field.type === 'number' ? (
        <input
          type="text"
          value={value}
          onChange={onChange}
          required={field.required}
          placeholder={field.placeholder}
          inputMode="numeric"
          disabled={disabled}
          className={baseClass}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={onChange}
          required={field.required}
          placeholder={field.placeholder}
          disabled={disabled}
          className={baseClass}
        />
      )}
    </div>
  )
}
