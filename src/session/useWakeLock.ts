import { useEffect } from 'react'

type Sentinel = { release: () => Promise<void> }
type WakeLockApi = { request: (type: 'screen') => Promise<Sentinel> }

/** Holds a screen wake lock while mounted; re-requests when the page becomes visible again. */
export function useWakeLock(active = true): void {
  useEffect(() => {
    if (!active) return
    const wl = (navigator as unknown as { wakeLock?: WakeLockApi }).wakeLock
    if (!wl || typeof wl.request !== 'function') return
    let sentinel: Sentinel | null = null
    let disposed = false

    const acquire = async () => {
      try {
        const s = await wl.request('screen')
        if (disposed) {
          void s.release().catch(() => {})
          return
        }
        void sentinel?.release().catch(() => {})
        sentinel = s
      } catch {
        /* denied or unsupported */
      }
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVis)
      void sentinel?.release().catch(() => {})
      sentinel = null
    }
  }, [active])
}
