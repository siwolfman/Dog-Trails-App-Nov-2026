import { useEffect, useRef } from 'react'

/** Calls `onVisible` once, the first time the element is at least half on screen. */
export function useOnVisible<T extends Element>(onVisible: () => void, enabled = true) {
  const ref = useRef<T>(null)
  const done = useRef(false)
  const cb = useRef(onVisible)
  useEffect(() => {
    cb.current = onVisible
  })

  useEffect(() => {
    const el = ref.current
    if (!enabled || !el || done.current) return
    const fire = () => {
      if (done.current) return
      done.current = true
      cb.current()
    }
    if (typeof IntersectionObserver === 'undefined') return fire()
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && (fire(), io.disconnect()),
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [enabled])

  return ref
}
