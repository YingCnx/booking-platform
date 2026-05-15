'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

type Props = {
  href: string
  children: React.ReactNode
  className?: string
}

type Ripple = { x: number; y: number; id: number }

// ✅ Link ที่มี ripple + scale effect (ไม่มี spinner)
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
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 500)
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
      onMouseUp={() => setTimeout(() => setPressed(false), 150)}
      onTouchStart={(e) => { setPressed(true); addRipple(e) }}
      className={[
        'relative overflow-hidden transition-transform duration-150 ease-out select-none',
        pressed ? 'scale-[0.94]' : 'scale-100',
        className,
      ].join(' ')}
    >
      {children}

      {/* Ripple */}
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
            background: 'rgba(0, 0, 0, 0.15)',
            animation: 'ripple 500ms ease-out forwards',
          }}
        />
      ))}

      <style>{`
        @keyframes ripple {
          0%   { width: 8px; height: 8px; opacity: 0.5; }
          100% { width: 280px; height: 280px; opacity: 0; }
        }
      `}</style>
    </a>
  )
}
