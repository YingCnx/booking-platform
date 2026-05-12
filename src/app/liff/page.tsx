'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    liff: any
  }
}

export default function LiffPage() {
  const [msg, setMsg] = useState('กำลังโหลด LIFF...')

  useEffect(() => {
    async function run() {
      try {
        const params = new URLSearchParams(window.location.search)

        const branchId = params.get('branchId')
        const redirect = params.get('redirect') ?? '/'

        if (!branchId) {
          setMsg('ERROR: branchId required')
          return
        }

        setMsg('กำลังโหลด config...')

        // โหลด config จาก DB
        const configRes = await fetch(
          `/api/shop-config?branchId=${branchId}`
        )

        const config = await configRes.json()

        const liffId = config.liffId

        if (!liffId) {
          setMsg('ERROR: no liffId')
          return
        }

        setMsg(`โหลด LIFF ID สำเร็จ`)

        // โหลด SDK
        if (!window.liff) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector(
              'script[src="https://static.line-scdn.net/liff/edge/2/sdk.js"]'
            )

            if (existing) {
              resolve()
              return
            }

            const script = document.createElement('script')

            script.src =
              'https://static.line-scdn.net/liff/edge/2/sdk.js'

            script.onload = () => resolve()

            script.onerror = () =>
              reject(new Error('โหลด LIFF SDK ไม่สำเร็จ'))

            document.head.appendChild(script)
          })
        }

        setMsg('กำลัง init LIFF...')

        // init LIFF
        await window.liff.init({
          liffId,
        })

        // login
        if (!window.liff.isLoggedIn()) {
          setMsg('กำลัง login LINE...')
          window.liff.login()
          return
        }

        setMsg('กำลังโหลดข้อมูล LINE...')

        // profile
        const profile = await window.liff.getProfile()

        // token
        const idToken =
          window.liff.getIDToken()

        // เก็บข้อมูลไว้
        sessionStorage.setItem(
          'line_profile',
          JSON.stringify(profile)
        )

        sessionStorage.setItem(
          'line_id_token',
          idToken ?? ''
        )

        setMsg('กำลังเข้าสู่ระบบ...')

        // redirect ไปหน้าจริง
        window.location.href = redirect

      } catch (err: any) {
        console.error(err)

        setMsg(
          `ERROR: ${err?.message ?? err}`
        )
      }
    }

    run()
  }, [])

  return (
    <main className="min-h-screen bg-black text-green-400 font-mono flex items-center justify-center px-6">
      <div className="text-center whitespace-pre-wrap">
        {msg}
      </div>
    </main>
  )
}