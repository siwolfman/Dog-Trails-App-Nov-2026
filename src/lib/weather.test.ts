import { HEAT_COPY, describeWeatherCode, heatLevel, parseWeather } from './weather.ts'

test('heat levels', () => {
  expect(heatLevel(68)).toBe('mild')
  expect(heatLevel(75)).toBe('warm')
  expect(heatLevel(84)).toBe('warm')
  expect(heatLevel(85)).toBe('hot')
  expect(heatLevel(95)).toBe('extreme')
})

test('only hot days carry a warning', () => {
  expect(HEAT_COPY.mild.warning).toBeNull()
  expect(HEAT_COPY.warm.warning).toBeNull()
  expect(HEAT_COPY.hot.warning).toMatch(/Heat warning/)
  expect(HEAT_COPY.extreme.warning).toMatch(/Heat warning/)
})

test('parses an Open-Meteo response', () => {
  const w = parseWeather({
    current: { temperature_2m: 66.4, weather_code: 2 },
    daily: { temperature_2m_max: [88.2], precipitation_probability_max: [10] },
  })
  expect(w).toEqual({
    currentF: 66,
    highF: 88,
    rainChance: 10,
    summary: 'Partly cloudy',
    heat: 'hot',
  })
})

test('rejects a malformed response so the UI can degrade', () => {
  expect(() => parseWeather({ nope: true })).toThrow()
})

test('weather codes', () => {
  expect(describeWeatherCode(0)).toBe('Clear')
  expect(describeWeatherCode(45)).toBe('Foggy')
  expect(describeWeatherCode(63)).toBe('Rain')
  expect(describeWeatherCode(96)).toBe('Thunderstorms')
})
