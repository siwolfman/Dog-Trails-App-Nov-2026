import { z } from 'zod'

/** Stored dog rule. `unverified` is deliberately NOT here: it is a derived display state. */
export const DOG_STATUSES = [
  'no_dogs',
  'leash_required',
  'off_leash_zones',
  'off_leash_ok',
] as const
export const DogStatusSchema = z.enum(DOG_STATUSES)
export type DogStatus = z.infer<typeof DogStatusSchema>

export const PLACE_TYPES = ['trail', 'park', 'beach'] as const
export const PlaceTypeSchema = z.enum(PLACE_TYPES)
export type PlaceType = z.infer<typeof PlaceTypeSchema>

/**
 * Coverage areas, north to south. North Bay = Marin, Napa, Sonoma and Solano. East Bay is split by
 * county and area: North = Contra Costa County, Central = northern Alameda County (Berkeley to
 * Hayward), South = Fremont, Union City, Newark and the Tri-Valley (Pleasanton, Dublin, Livermore).
 * South Bay = San Mateo County and the Peninsula, Silicon Valley, Half Moon Bay, San Jose, Morgan
 * Hill and Santa Cruz, with everything in between.
 */
export const REGIONS = [
  'north_bay',
  'east_bay_north',
  'east_bay_central',
  'east_bay_south',
  'san_francisco',
  'south_bay',
] as const
export const RegionSchema = z.enum(REGIONS)
export type Region = z.infer<typeof RegionSchema>

export const VERIFICATION_STATUSES = ['verified', 'needs_verification'] as const
export const VerificationStatusSchema = z.enum(VERIFICATION_STATUSES)

export const HAZARDS = [
  'foxtails',
  'ticks',
  'cattle_grazing',
  'hot_pavement',
  'rattlesnakes',
  'poison_oak',
  'seasonal_closures',
  'cliffs',
  'strong_surf',
  'cyclists',
  'wildlife',
  'mud',
] as const
export const HazardSchema = z.enum(HAZARDS)
export type Hazard = z.infer<typeof HazardSchema>

export const WATER_ACCESS = ['none', 'seasonal', 'yes'] as const
export const WaterAccessSchema = z.enum(WATER_ACCESS)
export type WaterAccess = z.infer<typeof WaterAccessSchema>

export const SHADE_LEVELS = ['none', 'some', 'lots'] as const
export const ShadeLevelSchema = z.enum(SHADE_LEVELS)
export type ShadeLevel = z.infer<typeof ShadeLevelSchema>

const isoDate = z.iso.date()
const httpsUrl = z.url({ protocol: /^https?$/ })

/**
 * A real photo of the place, self-hosted in public/photos. Only free-licensed images
 * (Wikimedia Commons) are used, and the credit is always shown with the photo.
 */
export const PhotoSchema = z.object({
  src: z.string().regex(/^\/photos\/[a-z0-9-]+\.jpg$/),
  alt: z.string().min(5),
  credit: z.string().min(1),
  license: z.string().min(1),
  /** The Commons page for the image: where the author, license and original live. */
  source_url: httpsUrl,
  license_url: httpsUrl.nullable(),
})
export type Photo = z.infer<typeof PhotoSchema>

/**
 * What the agency's own pages say about dog-friendly trails. Nothing here is estimated:
 * a trail is listed only if an official page says dogs may use it, and `miles` is null when
 * the page gives no length. `park_wide` holds facts about the whole place, shown as such.
 */
export const DogTrailSchema = z.object({
  name: z.string().min(1),
  miles: z.number().positive().nullable(),
  /** Why we say dogs may use it: the agency's wording or a close paraphrase. */
  dog_note: z.string().min(1),
})
export type DogTrail = z.infer<typeof DogTrailSchema>

export const DogTrailsSchema = z.object({
  trails: z.array(DogTrailSchema),
  park_wide: z.array(z.string().min(1)),
  sources: z.array(z.object({ label: z.string().min(1), url: httpsUrl })).min(1),
  verified_on: isoDate,
})
export type DogTrails = z.infer<typeof DogTrailsSchema>

export const PlaceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    place_type: PlaceTypeSchema,
    agency: z.string().min(1),
    lat: z.number().min(36.5).max(39.2),
    lng: z.number().min(-123.8).max(-121.2),
    region: RegionSchema,
    city: z.string().min(1),
    /** Null whenever the rule could not be confirmed from an official source. */
    dog_status: DogStatusSchema.nullable(),
    rule_summary: z.string().nullable(),
    off_leash_notes: z.string().nullable(),
    /** Every place needs an official page, even when its rule is unverified. */
    source_url: httpsUrl,
    verification_status: VerificationStatusSchema,
    verified_on: isoDate.nullable(),
    verified_by: z.string().nullable(),
    /** Why a place is unverified (shown in the banner), or a caveat on a verified rule. */
    verification_note: z.string().nullable().default(null),
    /** Days until a verified rule is due for recheck. */
    recheck_days: z.number().int().min(7).max(365).default(90),
    /**
     * 'agency' = water/shade/hazards/etc. come from the agency page.
     * 'editorial' = our own estimate; the UI labels it "Editor's note, not from the agency".
     * This never applies to the dog rule itself, which must always be sourced.
     */
    details_basis: z.enum(['editorial', 'agency']).default('editorial'),
    hazards: z.array(HazardSchema),
    water_access: WaterAccessSchema.nullable(),
    shade_level: ShadeLevelSchema.nullable(),
    parking_notes: z.string().nullable(),
    typical_duration_minutes: z.number().int().min(10).max(600).nullable(),
    /** Null when no free-licensed photo was found: the page keeps the generic header. */
    photo: PhotoSchema.nullable().default(null),
    /** Null when the agency does not publish dog-friendly trail details. */
    dog_trails: DogTrailsSchema.nullable().default(null),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
  })
  .superRefine((p, ctx) => {
    if (p.verification_status === 'verified') {
      if (!p.dog_status || !p.rule_summary || !p.verified_on || !p.verified_by) {
        ctx.addIssue({
          code: 'custom',
          message:
            'verified places need dog_status, rule_summary, verified_on and verified_by',
        })
      }
    } else if (p.dog_status !== null || p.rule_summary !== null) {
      ctx.addIssue({
        code: 'custom',
        message: 'needs_verification places must not carry a dog_status or rule_summary',
      })
    }
  })
export type Place = z.infer<typeof PlaceSchema>

export const PlaceRuleHistorySchema = z.object({
  id: z.string().min(1),
  place_id: z.string().min(1),
  previous_status: DogStatusSchema.nullable(),
  new_status: DogStatusSchema.nullable(),
  changed_on: isoDate,
  source_url: httpsUrl,
  note: z.string(),
})
export type PlaceRuleHistory = z.infer<typeof PlaceRuleHistorySchema>

export const REPORT_TYPES = ['wrong_rule', 'closure', 'other'] as const
export const ReportTypeSchema = z.enum(REPORT_TYPES)
export type ReportType = z.infer<typeof ReportTypeSchema>

/** What the form submits. */
export const NewReportSchema = z.object({
  place_id: z.string().min(1),
  report_type: ReportTypeSchema,
  message: z
    .string()
    .trim()
    .min(5, 'Tell us a little more (at least 5 characters).')
    .max(1000, 'Keep it under 1000 characters.'),
})
export type NewReport = z.infer<typeof NewReportSchema>

export const ReportSchema = NewReportSchema.extend({
  id: z.string().min(1),
  created_at: z.iso.datetime({ offset: true }),
  status: z.enum(['open', 'reviewed', 'resolved']),
})
export type Report = z.infer<typeof ReportSchema>

/**
 * Display name for reviews. It must never be an email address, so '@' is rejected: the account's
 * email stays private and only this name is shown.
 */
export const DisplayNameSchema = z
  .string()
  .trim()
  .min(2, 'Use at least 2 characters.')
  .max(30, 'Use 30 characters or fewer.')
  .refine(
    (v) => !v.includes('@'),
    'Do not use an email address. Pick a name or nickname.',
  )
export type DisplayName = z.infer<typeof DisplayNameSchema>

export const ProfileSchema = z.object({
  user_id: z.string().min(1),
  display_name: DisplayNameSchema,
})
export type Profile = z.infer<typeof ProfileSchema>

/** Only GIPHY-hosted images are accepted; the picker itself arrives with the GIPHY details. */
export const ReviewGifSchema = z.object({
  id: z.string().min(1).max(64),
  url: z.string().regex(/^https:\/\/(media[0-9]*|i)\.giphy\.com\/[\w./%~+-]+$/),
  title: z.string().max(200),
})
export type ReviewGif = z.infer<typeof ReviewGifSchema>

export const RATING_MIN = 1
export const RATING_MAX = 5
export const COMMENT_MAX = 500

/** What the review form submits. One review per person per place, so this is also the edit shape. */
export const NewReviewSchema = z.object({
  place_id: z.string().min(1),
  rating: z
    .number({ error: 'Choose 1 to 5 paw prints.' })
    .int()
    .min(RATING_MIN, 'Choose 1 to 5 paw prints.')
    .max(RATING_MAX, 'Choose 1 to 5 paw prints.'),
  comment: z
    .string()
    .trim()
    .max(COMMENT_MAX, `Keep your comment to ${COMMENT_MAX} characters.`)
    .nullable(),
  gif: ReviewGifSchema.nullable(),
})
export type NewReview = z.infer<typeof NewReviewSchema>

export const ReviewSchema = NewReviewSchema.extend({
  id: z.string().min(1),
  user_id: z.string().min(1),
  display_name: DisplayNameSchema,
  hidden: z.boolean(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
})
export type Review = z.infer<typeof ReviewSchema>

export const SundayPickSchema = z.object({
  id: z.string().min(1),
  week_start: isoDate,
  place_id: z.string().min(1),
  note: z.string().max(280),
  sort_order: z.number().int().min(0),
})
export type SundayPick = z.infer<typeof SundayPickSchema>

export const EVENT_NAMES = [
  'place_viewed',
  'gonogo_opened',
  'source_link_clicked',
  'report_submitted',
  'filter_used',
  // Addition beyond the brief's five: needed to measure weekly return to Sunday Picks.
  'sunday_viewed',
] as const
export const EventNameSchema = z.enum(EVENT_NAMES)
export type EventName = z.infer<typeof EventNameSchema>

export const AppEventSchema = z.object({
  id: z.string().min(1),
  event_name: EventNameSchema,
  place_id: z.string().nullable(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  created_at: z.iso.datetime({ offset: true }),
})
export type AppEvent = z.infer<typeof AppEventSchema>

export const SeedFileSchema = z.object({
  places: z.array(PlaceSchema).min(1),
  place_rule_history: z.array(PlaceRuleHistorySchema),
  sunday_picks: z.array(SundayPickSchema),
})
export type SeedFile = z.infer<typeof SeedFileSchema>
