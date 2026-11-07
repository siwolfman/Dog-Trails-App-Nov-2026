import { z } from 'zod'

/** Open-Meteo: free, no API key. We send only the place's coordinates, never the visitor's. */
const ForecastSchema = z.object({
  current: z.object({ temperature_2m: z.number(), weather_code: z.number() }),
  daily: z.object({
    temperature_2m_max: z.array(z.number()).min(1),
    precipitation_probability_max: z.array(z.number().nullable()).min(1),
  }),
})

export type HeatLevel = 'mild' | 'warm' | 'hot' | 'extreme'

export interface Weather {
  currentF: number
  highF: number
  rainChance: number | null
  summary: string
  heat: HeatLevel
}

export function heatLevel(highF: number): HeatLevel {
  if (highF >= 95) return 'extreme'
  if (highF >= 85) return 'hot'
  if (highF >= 75) return 'warm'
  return 'mild'
}

export const HEAT_COPY: Record<HeatLevel, { label: string; warning: string | null }> = {
  mild: { label: 'Mild', warning: null },
  warm: { label: 'Warm', warning: null },
  hot: {
    label: 'Hot',
    warning:
      'Heat warning: bring extra water for your dog and keep walks short or shaded.',
  },
  extreme: {
    label: 'Very hot',
    warning:
      'Heat warning: dangerous for dogs. Skip midday, test pavement with your hand, and consider another day.',
  },
}

/** WMO weather codes, grouped. */
export function describeWeatherCode(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Partly cloudy'
  if (code === 45 || code === 48) return 'Foggy'
  if (code >= 51 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Showers'
  if (code >= 95) return 'Thunderstorms'
  return 'Cloudy'
}

export function parseWeather(json: unknown): Weather {
  const f = ForecastSchema.parse(json)
  const highF = Math.round(f.daily.temperature_2m_max[0] ?? f.current.temperature_2m)
  return {
    currentF: Math.round(f.current.temperature_2m),
    highF,
    rainChance: f.daily.precipitation_probability_max[0] ?? null,
    summary: describeWeatherCode(f.current.weather_code),
    heat: heatLevel(highF),
  }
}

const cache = new Map<string, Promise<Weather>>()

export function fetchWeather(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<Weather> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`
  const hit = cache.get(key)
  if (hit) return hit
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}&longitude=${lng}` +
    '&current=temperature_2m,weather_code' +
    '&daily=temperature_2m_max,precipitation_probability_max' +
    '&temperature_unit=fahrenheit&timezone=auto&forecast_days=1'
  const p = fetch(url, { signal })
    .then((r) => {
      if (!r.ok) throw new Error(`Weather request failed (${r.status})`)
      return r.json()
    })
    .then(parseWeather)
  // Do not cache failures.
  p.catch(() => cache.delete(key))
  cache.set(key, p)
  return p
}
