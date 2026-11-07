import { useEffect, useState } from 'react'
import { dataClient } from './index.ts'
import type { Place } from './schemas.ts'

export function usePlaces(): { places: Place[]; loading: boolean } {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let live = true
    dataClient.listPlaces().then((p) => {
      if (live) {
        setPlaces(p)
        setLoading(false)
      }
    })
    return () => {
      live = false
    }
  }, [])
  return { places, loading }
}
