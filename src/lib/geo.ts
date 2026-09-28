// Geo sem PostGIS (spec §4 decisão 6): Haversine puro em JS sobre a coleção
// de estabelecimentos — no máximo algumas centenas de registros no seed.

const EARTH_RADIUS_METERS = 6371000

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_METERS * c
}

/** "350 m" até 999 m, "1,2 km" depois (spec §6, "Idioma, formatos e fuso"). */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}

/**
 * Desloca um ponto de referência por `north`/`east` metros — usado pelo seed
 * (spec §8) para posicionar estabelecimentos fictícios a uma distância alvo.
 */
export function offsetMeters(lat: number, lng: number, north: number, east: number): { lat: number; lng: number } {
  const dLat = north / EARTH_RADIUS_METERS
  const dLng = east / (EARTH_RADIUS_METERS * Math.cos(toRad(lat)))
  return { lat: lat + (dLat * 180) / Math.PI, lng: lng + (dLng * 180) / Math.PI }
}

export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
