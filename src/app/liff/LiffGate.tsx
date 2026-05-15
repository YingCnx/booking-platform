'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window { liff: any }
}

type Props = {
  liffId: string
  redirectTo: string
}

export function LiffGate({ liffId, redirectTo }: Props) {
  const [status, setStatus] = useState('กำลังเชื่อมต่อ LINE...')
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!liffId) {
      setError('ระบบยังไม่ได้ตั้งค่า LIFF')
      return
    }

    async function start() {
      try {
        // โหลด LIFF SDK
        if (!document.querySelector('script[src*="liff/edge"]')) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('โหลด LIFF ไม่สำเร็จ'))
            document.head.appendChild(script)
          })
        }

        // init พร้อม withLoginOnExternalBrowser
        // → จะ auto-login บน browser ภายนอก
        await window.liff.init({
          liffId,
          withLoginOnExternalBrowser: true,
        })

        // ถ้ายังไม่ logged in → บังคับ login
        if (!window.liff.isLoggedIn()) {
          setStatus('กรุณา login LINE...')
          window.liff.login({ redirectUri: window.location.href })
          return
        }

        // ดึง profile + idToken
        setStatus('กำลังโหลดข้อมูล...')
        const profile = await window.liff.getProfile()
        const idToken = window.liff.getIDToken()

        if (!idToken) {
          throw new Error('ไม่ได้รับ idToken — กรุณาลองใหม่')
        }

        // ส่งไป server เพื่อ verify + set cookie
        setStatus('กำลังตรวจสอบ...')
        const res = await fetch('/api/liff/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            liffId,
            displayName: profile.displayName,
            pictureUrl:  profile.pictureUrl ?? null,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message ?? 'verify failed')
        }

        // redirect ไป target page
        setStatus('เรียบร้อย! กำลังพาคุณไป...')
        window.location.href = redirectTo

      } catch (err: any) {
        console.error('[LiffGate]', err)
        setError(err?.message ?? 'เกิดข้อผิดพลาด')
      }
    }

    start()
  }, [liffId, redirectTo])

  if (error) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">😕</div>
        <h1 className="text-lg font-bold text-gray-900">เชื่อมต่อ LINE ไม่สำเร็จ</h1>
        <p className="mt-2 text-sm text-red-600 break-words">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 w-full bg-gray-900 text-white font-semibold py-3 rounded-2xl text-sm"
        >
          ลองใหม่
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm text-center">
      <div className="w-10 h-10 mx-auto border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      <p className="mt-4 text-sm text-gray-600">{status}</p>
    </div>
  )
}
