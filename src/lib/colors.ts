/** Mirrors the @theme tokens in src/index.css (a test keeps them in sync). */
export const COLORS = {
  paper: '#f6f2e8',
  card: '#fefcf5',
  ink: '#1b2e27',
  inkSoft: '#46564f',
  sand: '#e4ddcb',
  button: '#7f9f76',
  teal: '#2f6670',
  tealDeep: '#234f58',
  tealTint: '#dbebea',
  amber: '#e8b95a',
  amberTint: '#f6e3b8',
  oxblood: '#7b2c20',
  unverifiedFill: '#f0ebdd',
} as const

/** Background and foreground used for each state's badge and map pin. */
export const STATUS_COLORS = {
  off_leash_ok: { bg: COLORS.teal, fg: COLORS.card, ring: COLORS.card },
  off_leash_zones: { bg: COLORS.tealTint, fg: COLORS.tealDeep, ring: COLORS.teal },
  leash_required: { bg: COLORS.amber, fg: COLORS.ink, ring: COLORS.ink },
  no_dogs: { bg: COLORS.oxblood, fg: COLORS.card, ring: COLORS.card },
  unverified: { bg: COLORS.unverifiedFill, fg: COLORS.ink, ring: COLORS.ink },
} as const
