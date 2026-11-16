import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import Supercluster from 'supercluster'
import { useEffect, useRef } from 'react'
import type { Place } from '@/data/schemas.ts'
import { STATUS_META, getDisplayRule } from '@/lib/dogStatus.ts'
import { STATUS_COLORS } from '@/lib/colors.ts'
import { STATUS_ICON_SVG } from '@/lib/statusIcons.ts'

// Vite serves the worker as a separate file; MapLibre 6 needs its URL up front.
maplibregl.setWorkerUrl(workerUrl)

interface Props {
  places: Place[]
  today: string
  selectedId: string | null
  onSelect: (id: string | null) => void
  onOpen: (slug: string) => void
}

const BAY_CENTER: [number, number] = [-122.3, 37.75]

/**
 * Default style: public OSM raster tiles, desaturated to sit under the pins.
 * OSM's tile usage policy forbids heavy production use: set VITE_MAP_STYLE_URL
 * (e.g. OpenFreeMap, Protomaps, MapTiler) before real traffic.
 */
function mapStyle(): string | maplibregl.StyleSpecification {
  const url = import.meta.env.VITE_MAP_STYLE_URL as string | undefined
  if (url) return url
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#eee8da' } },
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
        paint: {
          'raster-saturation': -0.55,
          'raster-opacity': 0.78,
          'raster-contrast': -0.1,
        },
      },
    ],
  }
}

function applySelection(
  pins: Map<string, { marker: maplibregl.Marker; el: HTMLElement }>,
  selectedId: string | null,
) {
  for (const [id, { el }] of pins) el.dataset.selected = String(id === selectedId)
}

function buildPin(
  place: Place,
  today: string,
  handlers: { onPin: () => void; onLabel: () => void },
): HTMLElement {
  const rule = getDisplayRule(place, today)
  const colors = STATUS_COLORS[rule.state]
  const wrap = document.createElement('div')
  wrap.className = 'pin-wrap'
  wrap.dataset.id = place.id

  const pin = document.createElement('button')
  pin.type = 'button'
  pin.className = 'pin'
  pin.dataset.state = rule.state
  pin.setAttribute('aria-label', `${place.name}, ${STATUS_META[rule.state].label}`)
  pin.style.setProperty('--pin-bg', colors.bg)
  pin.style.setProperty('--pin-fg', colors.fg)
  pin.style.setProperty('--pin-ring', colors.ring)
  pin.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${STATUS_ICON_SVG[rule.state]}</svg>`
  pin.addEventListener('click', (e) => {
    e.stopPropagation()
    handlers.onPin()
  })

  const label = document.createElement('button')
  label.type = 'button'
  label.className = 'pin-label'
  label.textContent = place.name
  label.setAttribute('aria-label', `Open ${place.name}`)
  label.addEventListener('click', (e) => {
    e.stopPropagation()
    handlers.onLabel()
  })

  wrap.append(pin, label)
  return wrap
}

type PointProps = { id: string }

/** A round count badge for several nearby places. Pressing it zooms in until they separate. */
function buildCluster(count: number, onPress: () => void): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'cluster-wrap'
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'cluster'
  const size = count >= 50 ? 60 : count >= 15 ? 52 : 44
  button.style.setProperty('--cluster-size', `${size}px`)
  button.textContent = String(count)
  button.setAttribute('aria-label', `${count} places here. Zoom in to see them.`)
  button.addEventListener('click', (e) => {
    e.stopPropagation()
    onPress()
  })
  wrap.append(button)
  return wrap
}

export default function PlaceMap({ places, today, selectedId, onSelect, onOpen }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markers = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLElement }>>(
    new Map(),
  )
  const clusterMarkers = useRef<maplibregl.Marker[]>([])
  const index = useRef<Supercluster<PointProps> | null>(null)
  const placesRef = useRef<Map<string, Place>>(new Map())
  const todayRef = useRef(today)
  const render = useRef<() => void>(() => {})
  const selectedRef = useRef(selectedId)
  const cb = useRef({ onSelect, onOpen })

  useEffect(() => {
    selectedRef.current = selectedId
    cb.current = { onSelect, onOpen }
    todayRef.current = today
  })

  // Create the map once.
  useEffect(() => {
    if (!container.current) return
    const map = new maplibregl.Map({
      container: container.current,
      style: mapStyle(),
      center: BAY_CENTER,
      zoom: 8.7,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    })
    map.touchZoomRotate.disableRotation()
    map.on('click', () => cb.current.onSelect(null))
    // Pins are redrawn after every pan or zoom: places that are close together become one badge.
    map.on('moveend', () => render.current())
    mapRef.current = map
    // The container can change size after mount (side panel layout, rotation).
    const observer = new ResizeObserver(() => map.resize())
    observer.observe(container.current)
    const current = markers.current
    const currentClusters = clusterMarkers.current
    return () => {
      observer.disconnect()
      current.clear()
      currentClusters.length = 0
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Rebuild the cluster index when the visible places change, then fit the map to them.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    placesRef.current = new Map(places.map((p) => [p.id, p]))
    const idx = new Supercluster<PointProps>({ radius: 60, maxZoom: 13, minPoints: 2 })
    idx.load(
      places.map((p) => ({
        type: 'Feature' as const,
        properties: { id: p.id },
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      })),
    )
    index.current = idx

    const addPin = (place: Place) => {
      const el = buildPin(place, todayRef.current, {
        onPin: () =>
          selectedRef.current === place.id
            ? cb.current.onOpen(place.slug)
            : cb.current.onSelect(place.id),
        onLabel: () => cb.current.onOpen(place.slug),
      })
      el.dataset.selected = String(place.id === selectedRef.current)
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([place.lng, place.lat])
        .addTo(map)
      markers.current.set(place.id, { marker, el })
    }

    render.current = () => {
      const tree = index.current
      if (!tree) return
      for (const { marker } of markers.current.values()) marker.remove()
      markers.current.clear()
      for (const marker of clusterMarkers.current) marker.remove()
      clusterMarkers.current.length = 0

      const b = map.getBounds()
      const features = tree.getClusters(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        Math.round(map.getZoom()),
      )
      for (const f of features) {
        const [lng, lat] = f.geometry.coordinates as [number, number]
        if ('cluster' in f.properties && f.properties.cluster) {
          const clusterId = f.properties.cluster_id
          const el = buildCluster(f.properties.point_count, () => {
            const zoom = Math.min(tree.getClusterExpansionZoom(clusterId), 16)
            map.easeTo({ center: [lng, lat], zoom, duration: 400 })
          })
          clusterMarkers.current.push(
            new maplibregl.Marker({ element: el, anchor: 'center' })
              .setLngLat([lng, lat])
              .addTo(map),
          )
        } else {
          const place = placesRef.current.get((f.properties as PointProps).id)
          if (place) addPin(place)
        }
      }
      // The selected place is always shown as its own pin, even inside a crowd.
      const selected = selectedRef.current
      const sel = selected ? placesRef.current.get(selected) : undefined
      if (sel && !markers.current.has(sel.id)) addPin(sel)
    }
    render.current()

    if (places.length === 0) return
    const bounds = new maplibregl.LngLatBounds()
    for (const p of places) bounds.extend([p.lng, p.lat])
    const wide = window.innerWidth >= 768
    map.fitBounds(bounds, {
      padding: wide
        ? { top: 130, bottom: 60, left: 60, right: 60 }
        : {
            top: 150,
            bottom: Math.round(window.innerHeight * 0.5) + 20,
            left: 40,
            right: 40,
          },
      maxZoom: 12,
      duration: 400,
    })
  }, [places, today])

  // Reflect selection on existing pins and bring the selected place into view.
  useEffect(() => {
    render.current() // makes sure the selected place is drawn even if it sits in a cluster
    applySelection(markers.current, selectedId)
    const map = mapRef.current
    const place = places.find((p) => p.id === selectedId)
    if (map && place) {
      // On phones the list sheet covers the lower half: aim the pin at the visible half.
      const narrow = window.innerWidth < 768
      map.easeTo({
        center: [place.lng, place.lat],
        offset: narrow ? [0, -Math.round(window.innerHeight * 0.22)] : [0, 0],
        duration: 300,
      })
    }
  }, [selectedId, places])

  // The outer div owns layout. MapLibre's unlayered CSS would override Tailwind's
  // layered `absolute`, so the map gets its own plain full-size child.
  return (
    <div className="absolute inset-0 md:static md:h-full md:flex-1">
      <div
        ref={container}
        className="h-full w-full"
        role="region"
        aria-label="Map of dog-friendly places"
      />
    </div>
  )
}
