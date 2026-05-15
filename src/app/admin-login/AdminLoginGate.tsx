'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window { liff: any }
}

type Props = { liffId: string }
type Status = 'loading' | 'login_required' | 'verifying' | 'success' | 'no_permission' | 'error'

export function AdminLoginGate({ liffId }: Props) {
  const [status, setStatus]       = useState<Status>('loading')
  const [message, setMessage]     = useState('กำลังเชื่อมต่อ LINE...')
  const [error, setError]         = useState('')
  const [lineUserId, setLineUserId] = useState('')
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    if (!liffId) {
      setStatus('error')
      setError('ระบบยังไม่ได้ตั้งค่า LIFF')
      return
    }

    async function start() {
      try {
        // โหลด SDK
        if (!document.querySelector('script[src*="liff/edge"]')) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script')
            s.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
            s.onload = () => resolve()
            s.onerror = () => reject(new Error('โหลด LIFF ไม่สำเร็จ'))
            document.head.appendChild(s)
          })
        }

        await window.liff.init({ liffId, withLoginOnExternalBrowser: true })

        if (!window.liff.isLoggedIn()) {
          setMessage('กรุณา login LINE...')
          window.liff.login({ redirectUri: window.location.href })
          return
        }

        setMessage('กำลังตรวจสอบสิทธิ์...')
        setStatus('verifying')

        const profile = await window.liff.getProfile()
        const idToken = window.liff.getIDToken()

        setDisplayName(profile.displayName)
        setLineUserId(profile.userId)

        if (!idToken) {
          setStatus('error')
          setError('ไม่ได้รับ idToken')
          return
        }

        const res = await fetch('/api/admin/auth/line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            displayName: profile.displayName,
            pictureUrl:  profile.pictureUrl,
            liffId,
          }),
        })

        const data = await res.json()

        if (res.status === 403) {
          // ไม่ได้รับสิทธิ์ — แสดง userId เพื่อให้ admin หลักเพิ่ม
          setStatus('no_permission')
          return
        }

        if (!res.ok) {
          setStatus('error')
          setError(data.error ?? 'ตรวจสอบสิทธิ์ไม่ผ่าน')
          return
        }

        setStatus('success')
        window.location.href = data.redirectTo ?? '/admin'
      } catch (err: any) {
        setStatus('error')
        setError(err?.message ?? 'เกิดข้อผิดพลาด')
      }
    }
    start()
  }, [liffId])

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="text-5xl mb-3">✅</div>
        <p className="text-zinc-300 text-sm">กำลังเข้าสู่ระบบ...</p>
      </div>
    )
  }

  if (status === 'no_permission') {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h1 className="text-lg font-bold text-white">ไม่มีสิทธิ์เข้าใช้งาน</h1>
        <p className="text-zinc-400 text-sm mt-3">
          คุณ <span className="text-white font-semibold">{displayName}</span> ยังไม่ได้รับสิทธิ์ admin
        </p>
        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">LINE User ID ของคุณ</div>
          <div className="font-mono text-xs text-white break-all">{lineUserId}</div>
        </div>
        <p className="text-zinc-500 text-xs mt-4 leading-relaxed">
          กรุณาส่ง User ID นี้ให้เจ้าของระบบ
          <br />เพื่อเพิ่มสิทธิ์ admin ของร้าน
        </p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(lineUserId)
            alert('คัดลอก User ID แล้ว')
          }}
          className="mt-4 w-full bg-white text-black py-3 rounded-xl text-sm font-bold"
        >
          คัดลอก User ID
        </button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-3">⚠️</div>
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={() => window.location.reload()}
          className="mt-6 bg-white text-black px-6 py-3 rounded-xl text-sm font-bold">
          ลองใหม่
        </button>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="w-10 h-10 mx-auto border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      <p className="text-zinc-400 text-sm mt-4">{message}</p>
    </div>
  )
}
