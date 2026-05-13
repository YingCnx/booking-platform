'use client'

import { useState, useTransition } from 'react'
import { createBooking } from '@/app/actions/create-booking'

type Props = {
  branchId: string
  serviceId: string
  time: string
  date: string
  defaultName?: string
}

export function BookingForm({
  branchId, serviceId, time, date, defaultName = '',
}: Props) {
  const [name, setName]       = useState(defaultName)
  const [phone, setPhone]     = useState('')
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [error, setError]     = useState('')

  // ✅ เบอร์ 10 หลักเท่านั้น
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(digitsOnly)
  }

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('กรุณากรอกชื่อ'); return }
    if (phone.length !== 10) { setError('เบอร์โทรต้อง 10 หลัก'); return }

    // ✅ ป้องกันกดซ้ำ — แสดง confirm dialog
    setConfirming(true)
  }

  function actuallySubmit() {
    if (pending) return  // กันกด confirm ซ้ำ
    startTransition(async () => {
      const formData = new FormData()
      formData.append('branchId',  branchId)
      formData.append('serviceId', serviceId)
      formData.append('time',      time)
      formData.append('date',      date)
      formData.append('name',      name.trim())
      formData.append('phone',     phone)
      await createBooking(formData)
    })
  }

  return (
    <>
      <form onSubmit={handleSubmitClick} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-900">
            ชื่อ
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="กรอกชื่อของคุณ"
            disabled={pending}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-900">
            เบอร์โทรศัพท์
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={handlePhoneChange}
            placeholder="0812345678"
            inputMode="numeric"
            maxLength={10}
            disabled={pending}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none disabled:opacity-50"
          />
          {phone.length > 0 && phone.length < 10 && (
            <p className="mt-1.5 text-xs text-amber-600">
              อีก {10 - phone.length} หลัก
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-black py-4 text-base font-bold text-white transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'กำลังบันทึก...' : 'ส่งคำขอจอง'}
        </button>
      </form>

      {/* ✅ Confirm Dialog */}
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden">
            <div className="px-5 py-5">
              <h3 className="text-lg font-bold text-gray-900">ยืนยันการจอง?</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                ส่งคำขอจองในชื่อ <span className="font-semibold text-gray-900">{name}</span>
                <br />
                เบอร์ <span className="font-semibold text-gray-900">{phone}</span>
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
                className="flex-1 py-3 bg-black text-white text-sm font-bold rounded-xl active:bg-gray-700 disabled:opacity-50 disabled:cursor-wait"
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
