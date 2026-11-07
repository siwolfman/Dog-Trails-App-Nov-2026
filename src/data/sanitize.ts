const MAX_STRING = 100

/** Keep event properties small, flat and free of anything that could identify a person. */
export function sanitizeProperties(
  props: Record<string, string | number | boolean> = {},
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(props).slice(0, 12)) {
    const key = k.slice(0, 40)
    out[key] = typeof v === 'string' ? v.slice(0, MAX_STRING) : v
  }
  return out
}
