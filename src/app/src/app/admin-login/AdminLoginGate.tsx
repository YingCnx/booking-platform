'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window { liff: any }
}

type Props = {
  liffId:   string
  groupId:  string
  nextPath: string
}

type Status = 'loading' | 'verifying' | 'success' | 'no_permission' | 'no_group' | 'error'

export function AdminLoginGate({ liffId, groupId, nextPath }: Props) {
  const [status, setStatus]   = useState<Status>('loading')
  const [message, setMessage] = useState('กำลังเชื่อมต่อ LINE...')
  const [error, setError]     = useState('')

  useEffect(() => {
    // ✅ ต้องมี groupId มาจาก URL — ไม่มี = เข้าตรงๆ ไม่ได้
    if (!groupId) {
      setStatus('no_group')
      return
    }

    if (!liffId) {
      setStatus('error')
      setError('ระบบยังไม่ได้ตั้งค่า LIFF')
      return
    }

    async function start() {
      try {
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

        // ✅ ส่ง userId + groupId ไป verify (ไม่ใช้ idToken)
        const res = await fetch('/api/admin/auth/line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineUserId:  profile.userId,
            displayName: profile.displayName,
            groupId,
          }),
        })

        if (res.status === 403) {
          setStatus('no_permission')
          return
        }
        if (res.status === 404) {
          setStatus('no_group')
          return
        }
        if (!res.ok) {
          const data = await res.json()
          setStatus('error')
          setError(data.error ?? 'ตรวจสอบสิทธิ์ไม่ผ่าน')
          return
        }

        setStatus('success')
        window.location.href = nextPath
      } catch (err: any) {
        setStatus('error')
        setError(err?.message ?? 'เกิดข้อผิดพลาด')
      }
    }
    start()
  }, [liffId, groupId, nextPath])

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="text-5xl mb-3">✅</div>
        <p className="text-zinc-300 text-sm">กำลังเข้าสู่ระบบ...</p>
      </div>
    )
  }

  if (status === 'no_group') {
    return (
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-3">🔒</div>
        <h1 className="text-lg font-bold text-white">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
          กรุณาเข้าผ่านลิงก์ในกลุ่ม LINE Admin ของร้าน
        </p>
      </div>
    )
  }

  if (status === 'no_permission') {
    return (
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-3">🚫</div>
        <h1 className="text-lg font-bold text-white">คุณไม่ได้อยู่ในกลุ่ม</h1>
        <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
          ต้องเป็นสมาชิกในกลุ่ม LINE Admin ของร้านนี้
          <br />ถึงจะเข้าใช้งานได้
        </p>
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
