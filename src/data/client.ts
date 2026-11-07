import type {
  AppEvent,
  EventName,
  NewReport,
  Place,
  PlaceRuleHistory,
  Report,
  SundayPick,
} from './schemas.ts'

export interface NewSundayPick {
  place_id: string
  note: string
}

/**
 * The seam between the UI and wherever data lives.
 * Today: localClient (bundled seed + localStorage).
 * Later: a Supabase implementation of this same interface; the UI does not change.
 */
export interface DataClient {
  listPlaces(): Promise<Place[]>
  getPlace(slug: string): Promise<Place | null>
  listPlaceHistory(placeId: string): Promise<PlaceRuleHistory[]>

  submitReport(report: NewReport): Promise<Report>
  listReports(): Promise<Report[]>
  updateReportStatus(id: string, status: Report['status']): Promise<void>

  /** Picks for a week (Monday ISO date). Defaults to the newest week that has picks. */
  getSundayPicks(
    weekStart?: string,
  ): Promise<{ weekStart: string | null; picks: SundayPick[] }>
  saveSundayPicks(weekStart: string, picks: NewSundayPick[]): Promise<SundayPick[]>

  logEvent(
    name: EventName,
    placeId: string | null,
    properties?: Record<string, string | number | boolean>,
  ): Promise<void>
  listEvents(): Promise<AppEvent[]>
  clearEvents(): Promise<void>
}
