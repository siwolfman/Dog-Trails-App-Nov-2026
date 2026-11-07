/** localStorage that never throws (private mode, blocked storage) and falls back to memory. */
const PREFIX = 'pawprint:v1:'
const memory = new Map<string, string>()

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key) ?? memory.get(key) ?? null
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    const raw = memory.get(key)
    if (raw === undefined) return fallback
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }
}

export function writeJSON(key: string, value: unknown): void {
  const raw = JSON.stringify(value)
  memory.set(key, raw)
  try {
    window.localStorage.setItem(PREFIX + key, raw)
  } catch {
    /* storage unavailable: the in-memory copy still works for this tab */
  }
}

export function clearStorageKey(key: string): void {
  memory.delete(key)
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}
