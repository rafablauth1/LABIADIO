'use client'

import { useEffect, useState } from 'react'

interface Props {
  path: string | null | undefined
  alt?: string
  className?: string
}

export default function PhotoImg({ path, alt = 'Foto', className }: Props) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!path) { setSrc(null); return }
    fetch(`/api/storage/signed-url?path=${encodeURIComponent(path)}`)
      .then(r => r.json())
      .then(d => { if (d?.url) setSrc(d.url) })
      .catch(() => {})
  }, [path])

  if (!src) return null

  return (
    <img
      src={src}
      alt={alt}
      className={className ?? 'w-full max-h-48 object-contain rounded-lg border border-white/10 bg-navy/60'}
    />
  )
}
