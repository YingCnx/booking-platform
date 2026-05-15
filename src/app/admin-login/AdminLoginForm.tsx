'use client'

import { useState } from 'react'

export function AdminLoginForm() {
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'login failed')
        setLoading(false)
        return
      }

      window.location.href = '/admin'
    } catch {
      setError('เกิดข้อผิดพลาด')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={login} className="space-y-4">
      <div>
        <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-semibold">
          Secret Key
        </label>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          required
          autoFocus
          placeholder="ADMIN_SECRET_KEY"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
        />
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !secret}
        className="w-full bg-white text-black py-4 rounded-2xl text-base font-bold disabled:opacity-50"
      >
        {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
      </button>
    </form>
  )
}
