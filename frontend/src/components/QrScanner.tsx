import { useEffect, useRef, useState } from 'react'

type Props = {
  onScan: (value: string) => void
  active?: boolean
}

/** Camera QR reader via BarcodeDetector when available; otherwise shows a hint. */
export default function QrScanner({ onScan, active = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [supported, setSupported] = useState(true)
  const last = useRef('')

  useEffect(() => {
    if (!active) return
    let stream: MediaStream | null = null
    let timer: number | undefined
    let cancelled = false

    async function start() {
      const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
      } }).BarcodeDetector

      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setSupported(false)
        setError('Camera QR scanning is not supported in this browser. Paste the token instead.')
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const detector = new Detector({ formats: ['qr_code'] })

        const tick = async () => {
          if (cancelled || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            const value = codes[0]?.rawValue?.trim()
            if (value && value !== last.current) {
              last.current = value
              onScan(value)
            }
          } catch {
            /* frame miss */
          }
          timer = window.setTimeout(tick, 450)
        }
        tick()
      } catch {
        setError('Camera permission denied or unavailable.')
        setSupported(false)
      }
    }

    start()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [active, onScan])

  if (!supported) {
    return <div className="info-callout danger">{error || 'Scanner unavailable'}</div>
  }

  return (
    <div className="qr-scanner">
      <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 16, background: '#000', aspectRatio: '4/3', objectFit: 'cover' }} />
      {error && <div className="info-callout danger" style={{ marginTop: 8 }}>{error}</div>}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Point the camera at a visitor QR code.</p>
    </div>
  )
}
