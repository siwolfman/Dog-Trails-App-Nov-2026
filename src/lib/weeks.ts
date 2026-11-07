import { addDays } from './dogStatus.ts'

/** 0 = Sunday ... 6 = Saturday for an ISO date. */
function weekday(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay()
}

/** Monday of the week containing `iso` (weeks start on Monday). */
export function mondayOf(iso: string): string {
  const back = (weekday(iso) + 6) % 7
  return addDays(iso, -back)
}

/** The Monday that starts the week whose Sunday is the next upcoming Sunday (or today if it is Sunday). */
export function weekForNextSunday(today: string): string {
  const ahead = (7 - weekday(today)) % 7
  return mondayOf(addDays(today, ahead))
}

/** The Sunday of the week starting `weekStart`. */
export function sundayOf(weekStart: string): string {
  return addDays(weekStart, 6)
}
