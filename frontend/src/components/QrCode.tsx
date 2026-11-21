import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let active = true
    QRCode.toDataURL(value, { width: size, margin: 1, color: { dark: '#0b1220', light: '#ffffff' } })
      .then((url) => { if (active) setSrc(url) })
      .catch(() => { if (active) setSrc('') })
    return () => { active = false }
  }, [value, size])

  if (!src) return <div style={{ width: size, height: size, background: 'var(--bg)' }} />
  return <img src={src} width={size} height={size} alt="QR code" style={{ borderRadius: 8, display: 'block' }} />
}
