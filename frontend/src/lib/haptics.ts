/** Best-effort haptic feedback — vibrate where supported; no-op elsewhere (incl. most iOS Safari). */
export function haptic(kind: 'light' | 'medium' | 'success' = 'light') {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
    const pattern = kind === 'success' ? [12, 40, 12] : kind === 'medium' ? [18] : [10]
    navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}
