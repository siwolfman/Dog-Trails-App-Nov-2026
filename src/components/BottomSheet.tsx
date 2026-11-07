import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

type Snap = 'peek' | 'half' | 'full'
const ORDER: Snap[] = ['peek', 'half', 'full']

function snapHeights() {
  const vh = typeof window === 'undefined' ? 800 : window.innerHeight
  return { peek: 132, half: Math.round(vh * 0.5), full: Math.round(vh - 88) }
}

/** Mobile: draggable bottom sheet over the map. md+: fixed side panel. */
export default function BottomSheet({
  title,
  count,
  children,
}: {
  title: string
  count: string
  children: ReactNode
}) {
  const [snap, setSnap] = useState<Snap>('half')
  const [height, setHeight] = useState(() => snapHeights().half)
  const drag = useRef<{ y: number; h: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const onResize = () => setHeight(snapHeights()[snap])
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [snap])

  const settle = useCallback((h: number) => {
    const s = snapHeights()
    const nearest = ORDER.reduce((best, k) =>
      Math.abs(s[k] - h) < Math.abs(s[best] - h) ? k : best,
    )
    setSnap(nearest)
    setHeight(s[nearest])
  }, [])

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(snap) + 1) % ORDER.length] ?? 'half'
    setSnap(next)
    setHeight(snapHeights()[next])
  }

  return (
    <section
      aria-label={title}
      className="absolute inset-x-0 bottom-0 z-10 flex h-[var(--sheet-h)] flex-col rounded-t-[1.75rem] bg-card shadow-sheet md:static md:order-first md:h-full md:w-[27rem] md:rounded-none md:shadow-none md:border-r md:border-line"
      style={
        {
          '--sheet-h': `${height}px`,
          transition: dragging ? 'none' : 'height 220ms ease',
        } as React.CSSProperties
      }
    >
      <div
        className="touch-none select-none pt-2 md:hidden"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { y: e.clientY, h: height }
          setDragging(true)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const s = snapHeights()
          setHeight(
            Math.max(
              s.peek,
              Math.min(s.full, drag.current.h + drag.current.y - e.clientY),
            ),
          )
        }}
        onPointerUp={() => {
          if (!drag.current) return
          const moved = Math.abs(drag.current.h - height) > 6
          drag.current = null
          setDragging(false)
          if (moved) settle(height)
        }}
      >
        <button
          type="button"
          onClick={cycle}
          className="mx-auto flex h-8 w-24 items-center justify-center"
          aria-label={`Resize list, currently ${snap}`}
        >
          <span className="block h-1.5 w-12 rounded-full bg-ink/30" />
        </button>
      </div>
      <header className="flex items-baseline justify-between gap-3 border-b border-line px-5 pt-1 pb-3 md:pt-5">
        <h2 className="text-2xl">{title}</h2>
        <span className="shrink-0 font-mono text-sm text-ink-soft">{count}</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </section>
  )
}
