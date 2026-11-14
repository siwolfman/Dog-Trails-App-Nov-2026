import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { COLORS, STATUS_COLORS } from './colors.ts'
import { contrastRatio } from './contrast.ts'

describe('WCAG AA contrast', () => {
  const AA_TEXT = 4.5
  const AA_UI = 3

  test.each(Object.entries(STATUS_COLORS))('%s badge text on fill', (_state, c) => {
    expect(contrastRatio(c.bg, c.fg)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  test.each(Object.entries(STATUS_COLORS))(
    '%s ring is visible against the map',
    (_s, c) => {
      // Pins sit on the pale map; the ring or fill must separate from it.
      const edge = Math.max(
        contrastRatio(c.bg, COLORS.paper),
        contrastRatio(c.ring, COLORS.paper),
      )
      expect(edge).toBeGreaterThanOrEqual(AA_UI)
    },
  )

  test.each([
    ['ink on paper', COLORS.ink, COLORS.paper],
    ['ink on card', COLORS.ink, COLORS.card],
    ['ink-soft on paper', COLORS.inkSoft, COLORS.paper],
    ['ink-soft on card', COLORS.inkSoft, COLORS.card],
    ['card on teal-deep (verified stamp)', COLORS.card, COLORS.tealDeep],
    ['ink on amber (recheck stamp)', COLORS.ink, COLORS.amber],
    ['ink on amber-tint', COLORS.ink, COLORS.amberTint],
    ['ink on sand (stale stamp)', COLORS.ink, COLORS.sand],
    ['ink on button (sage)', COLORS.ink, COLORS.button],
  ])('%s', (_n, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT)
  })
})

describe('tokens', () => {
  test('colors.ts matches @theme in index.css', () => {
    const css = readFileSync('src/index.css', 'utf8')
    const pairs: [string, string][] = [
      ['paper', COLORS.paper],
      ['card', COLORS.card],
      ['ink', COLORS.ink],
      ['ink-soft', COLORS.inkSoft],
      ['sand', COLORS.sand],
      ['button', COLORS.button],
      ['teal', COLORS.teal],
      ['teal-deep', COLORS.tealDeep],
      ['teal-tint', COLORS.tealTint],
      ['amber', COLORS.amber],
      ['amber-tint', COLORS.amberTint],
      ['oxblood', COLORS.oxblood],
    ]
    for (const [name, hex] of pairs) {
      expect(css).toContain(`--color-${name}: ${hex};`)
    }
  })
})

describe('buttons', () => {
  test('cream text on the sage button fill would fail AA, so it must never be used', () => {
    expect(contrastRatio(COLORS.card, COLORS.button)).toBeLessThan(4.5)
  })

  test('no component puts text-card on bg-button', () => {
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) walk(full)
        else if (/\.tsx$/.test(name) && !/\.test\./.test(name)) files.push(full)
      }
    }
    walk('src')
    const offenders = files.flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .map((line, i) => ({ f, i: i + 1, line }))
        .filter(({ line }) => line.includes('bg-button') && line.includes('text-card')),
    )
    expect(offenders.map((o) => `${o.f}:${o.i}`)).toEqual([])
  })
})
