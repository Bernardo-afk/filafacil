// Localização do cliente (spec história 11): nunca bloqueia o app por falta
// de permissão. Preferência do navegador — não é dado de domínio (não é uma
// coleção do storage.ts), então tem sua própria chave em localStorage.

const KEY = 'filazero:client-location'

export type LocationPermission = 'granted' | 'denied' | 'unset'

export interface ClientLocation {
  permission: LocationPermission
  lat: number | null
  lng: number | null
  /** Cidade escolhida manualmente quando a permissão é negada/ignorada (spec: default Campinas-SP). */
  cityLabel: string
}

const DEFAULT_LOCATION: ClientLocation = { permission: 'unset', lat: null, lng: null, cityLabel: 'Campinas, SP' }

export function getClientLocation(): ClientLocation {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULT_LOCATION
    return { ...DEFAULT_LOCATION, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_LOCATION
  }
}

export function setClientLocation(location: ClientLocation): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(location))
  } catch {
    // localStorage bloqueado: perde a preferência entre sessões, mas não quebra o app
  }
}

/** Promise em vez do callback cru do browser. Nunca rejeita sem geolocalização disponível — resolve null. */
export function requestGeolocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 },
    )
  })
}
