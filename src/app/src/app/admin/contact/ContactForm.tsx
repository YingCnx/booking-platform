'use client'

import { useState } from 'react'

type Props = {
  bookingId: string
  customerName: string
}

// ✅ ข้อความสำเร็จรูป — กดเร็ว
const QUICK_MESSAGES = [
  'สวัสดีค่ะ ขอสอบถามเรื่องการจองนะคะ',
  'ขออภัย เวลาที่จองมีคิวซ้อน ขอเลื่อนเวลาได้ไหมคะ?',
  'ขออภัย วันที่จองมีปัญหา ขอเลื่อนวันได้ไหมคะ?',
  'ยืนยันการจองเรียบร้อยแล้ว ขอบคุณค่ะ',
  'กรุณาแจ้งล่วงหน้าหากต้องการยกเลิกหรือเลื่อนนัด',
]

export function ContactForm({ bookingId, customerName }: Props) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function send() {
    if (!message.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/admin/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'ส่งไม่สำเร็จ')
        return
      }
      setSent(true)
      setMessage('')
      setTimeout(() => setSent(false), 3000)
    } catch {
      setError('เกิดข้อผิดพลาด')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* Quick messages */}
      <div>
        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
          ข้อความสำเร็จรูป
        </div>
        <div className="space-y-2">
          {QUICK_MESSAGES.map((msg, i) => (
            <button
              key={i}
              onClick={() => setMessage(msg)}
              disabled={sending}
              className="w-full text-left px-4 py-3 border border-zinc-700 bg-zinc-900 text-sm text-zinc-300 rounded-xl hover:border-zinc-500 hover:text-white transition disabled:opacity-50"
            >
              {msg}
            </button>
          ))}
        </div>
      </div>

      {/* Custom message */}
      <div>
        <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
          ข้อความ
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="พิมพ์ข้อความ..."
          rows={4}
          disabled={sending}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 disabled:opacity-50 resize-none"
        />
        <div className="text-xs text-zinc-600 mt-1">{message.length} ตัวอักษร</div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {sent && (
        <div className="text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-800 rounded-xl px-4 py-3">
          ✓ ส่งข้อความหา {customerName} แล้ว
        </div>
      )}

      <button
        onClick={send}
        disabled={sending || !message.trim()}
        className="w-full bg-white text-black py-4 rounded-2xl text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending ? 'กำลังส่ง...' : '💬 ส่งข้อความ'}
      </button>

    </div>
  )
}
