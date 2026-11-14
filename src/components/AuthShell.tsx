import type { ReactNode } from 'react'
import Hero from './Hero.tsx'

/** Shared frame for the account pages: landscape band, brand name, content. */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-12">
      <div className="h-32 overflow-hidden">
        <Hero />
      </div>
      <main className="px-5 pt-6">
        <p className="font-display text-xl font-extrabold text-teal">Pawprint</p>
        {children}
      </main>
    </div>
  )
}
