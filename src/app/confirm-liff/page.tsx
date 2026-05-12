'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    liff: any
  }
}

export default function ConfirmLiffPage() {
  useEffect(() => {
    async function run() {
      const script = document.createElement('script')

      script.src =
        'https://static.line-scdn.net/liff/edge/2/sdk.js'

      script.onload = async () => {
        try {
          await window.liff.init({
            liffId: '2010068154-iVaf3lVo'
          })

          const url =
            sessionStorage.getItem(
              'redirect_after_liff'
            ) ?? '/'

          window.location.href = url

        } catch (e) {
          console.error(e)
        }
      }

      document.head.appendChild(script)
    }

    run()
  }, [])

  return (
    <div className="p-10">
      loading...
    </div>
  )
}