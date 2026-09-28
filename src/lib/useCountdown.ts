import { useEffect, useState } from 'react'

/** Segundos restantes até `target` (ISO), atualizado a cada segundo. 0 quando já passou. */
export function useCountdown(target: string | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!target) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [target])

  if (!target) return 0
  return Math.max(0, Math.ceil((new Date(target).getTime() - now) / 1000))
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
