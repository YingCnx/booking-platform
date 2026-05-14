'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

type Props = {
  href: string
  children: React.ReactNode
  className?: string
}

type Ripple = { x: number; y: number; id: number }

// ✅ Link ที่มี ripple effect + tactile feedback แรงๆ
export function SelectableLink({ href, children, className = '' }: Props) {
  const router = useRouter()
  const [pressed, setPressed] = useState(false)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const rippleId = useRef(0)

  function addRipple(e: React.MouseEvent | React.TouchEvent) {
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    const x = clientX - rect.left
    const y = clientY - rect.top
    const id = ++rippleId.current
    setRipples(prev => [...prev, { x, y, id }])
    // remove ripple หลัง animation จบ
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 600)
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    setPressed(true)
    addRipple(e)
    requestAnimationFrame(() => {
      router.push(href)
    })
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => !pressed && setPressed(false)}
      onTouchStart={(e) => { setPressed(true); addRipple(e) }}
      className={[
        'relative overflow-hidden transition-all duration-150 ease-out select-none',
        pressed ? 'scale-[0.94]' : 'scale-100',
        className,
      ].join(' ')}
    >
      {children}

      {/* Ripples */}
      {ripples.map(r => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: r.x,
            top: r.y,
            width: 8,
            height: 8,
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.2)',
            animation: 'ripple 600ms ease-out forwards',
          }}
        />
      ))}

      {/* Loading overlay */}
      {pressed && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/5 pointer-events-none">
          <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </span>
      )}

      <style>{`
        @keyframes ripple {
          0%   { width: 8px; height: 8px; opacity: 0.6; }
          100% { width: 300px; height: 300px; opacity: 0; }
        }
      `}</style>
    </a>
  )
}
