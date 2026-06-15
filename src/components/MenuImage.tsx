'use client'

import Image from 'next/image'
import { useState } from 'react'

export function MenuImage({
  src,
  alt,
  fallback = 'MENU',
  className = '',
  priority = false,
}: {
  src?: string | null
  alt: string
  fallback?: string
  className?: string
  priority?: boolean
}) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-slate-100 text-sm font-black tracking-[0.16em] text-slate-400 ${className}`}>
        {fallback.slice(0, 8)}
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 40vw, 320px"
        className="object-cover"
        priority={priority}
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  )
}
