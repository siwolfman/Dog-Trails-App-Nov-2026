import type { Region } from '@/data/schemas.ts'

export const REGION_LABELS: Record<Region, string> = {
  east_bay: 'East Bay',
  san_francisco: 'San Francisco',
  marin: 'Marin',
  peninsula: 'Peninsula',
  south_bay: 'South Bay',
}

const AGENCY_SHORT: Record<string, string> = {
  'East Bay Regional Park District': 'EBRPD',
  'Golden Gate National Recreation Area': 'GGNRA',
  'National Park Service': 'NPS',
  'Midpeninsula Regional Open Space District': 'Midpen',
  'San Mateo County Parks': 'San Mateo Co. Parks',
  'Marin County Parks': 'Marin Co. Parks',
  'California State Parks': 'CA State Parks',
}

export function agencyShort(agency: string): string {
  return AGENCY_SHORT[agency] ?? agency
}

export const HAZARD_LABELS: Record<string, string> = {
  foxtails: 'Foxtails',
  ticks: 'Ticks',
  cattle_grazing: 'Cattle grazing',
  hot_pavement: 'Hot pavement',
  rattlesnakes: 'Rattlesnakes',
  poison_oak: 'Poison oak',
  seasonal_closures: 'Seasonal closures',
  cliffs: 'Cliffs',
  strong_surf: 'Strong surf',
  cyclists: 'Cyclists',
  wildlife: 'Wildlife',
  mud: 'Mud after rain',
}

export const WATER_LABELS = {
  none: 'No water access',
  seasonal: 'Seasonal water',
  yes: 'Water access',
} as const
export const SHADE_LABELS = {
  none: 'Little shade',
  some: 'Some shade',
  lots: 'Lots of shade',
} as const

export function durationLabel(minutes: number | null): string | null {
  if (minutes === null) return null
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const hours = `${h} hr${h === 1 ? '' : 's'}`
  return m === 0 ? hours : `${hours} ${m} min`
}
