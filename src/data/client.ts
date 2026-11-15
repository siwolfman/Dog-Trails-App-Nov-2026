import type {
  AppEvent,
  EventName,
  NewReport,
  NewReview,
  Place,
  PlaceRuleHistory,
  Profile,
  Report,
  Review,
  SundayPick,
} from './schemas.ts'

export type CreateProfileResult =
  | { kind: 'ok'; profile: Profile }
  | { kind: 'taken' }
  | { kind: 'invalid'; message: string }

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

  /** The signed-in person's profile (display name), or null until they have chosen one. */
  getMyProfile(): Promise<Profile | null>
  /** Choose a display name. Names are unique ignoring case and can never contain '@'. */
  createProfile(displayName: string): Promise<CreateProfileResult>

  /** Visible reviews for a place, newest first. The caller's own review is included even if hidden. */
  listReviews(placeId: string): Promise<Review[]>
  /** Creates the caller's review for this place, or replaces it: one review per person per place. */
  saveReview(review: NewReview): Promise<Review>
  deleteMyReview(placeId: string): Promise<void>
  /** Admin only: every review including hidden ones. Everyone else just gets their own. */
  listAllReviews(): Promise<Review[]>
  /** Admin only. */
  setReviewHidden(id: string, hidden: boolean): Promise<void>

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
