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

export const REGIONS = [
  'east_bay',
  'san_francisco',
  'marin',
  'peninsula',
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

export const PlaceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    place_type: PlaceTypeSchema,
    agency: z.string().min(1),
    lat: z.number().min(36.5).max(38.5),
    lng: z.number().min(-123.5).max(-121.2),
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
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
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
  created_at: z.iso.datetime(),
  status: z.enum(['open', 'reviewed', 'resolved']),
})
export type Report = z.infer<typeof ReportSchema>

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
] as const
export const EventNameSchema = z.enum(EVENT_NAMES)
export type EventName = z.infer<typeof EventNameSchema>

export const AppEventSchema = z.object({
  id: z.string().min(1),
  event_name: EventNameSchema,
  place_id: z.string().nullable(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  created_at: z.iso.datetime(),
})
export type AppEvent = z.infer<typeof AppEventSchema>

export const SeedFileSchema = z.object({
  places: z.array(PlaceSchema).min(1),
  place_rule_history: z.array(PlaceRuleHistorySchema),
  sunday_picks: z.array(SundayPickSchema),
})
export type SeedFile = z.infer<typeof SeedFileSchema>
