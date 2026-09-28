import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { AuthInput } from '../../components/ui/AuthInput'
import { getClientLocation, setClientLocation, requestGeolocation } from '../../lib/clientLocation'

// LocationPermissionScreen (spec história 11): "Encontre lugares perto de
// você". Nunca bloqueia o app — negar ou ignorar cai na cidade escolhida
// manualmente (default Campinas-SP).
export function LocationPermissionScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [manualCity, setManualCity] = useState(false)
  const [city, setCity] = useState(getClientLocation().cityLabel)

  async function useMyLocation() {
    setLoading(true)
    const position = await requestGeolocation()
    if (position) {
      setClientLocation({ permission: 'granted', lat: position.lat, lng: position.lng, cityLabel: city })
    } else {
      setClientLocation({ ...getClientLocation(), permission: 'denied' })
    }
    setLoading(false)
    navigate('/app/restaurantes')
  }

  function saveManualCity() {
    setClientLocation({ permission: 'denied', lat: null, lng: null, cityLabel: city.trim() || 'Campinas, SP' })
    navigate('/app/restaurantes')
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <MapPin size={40} className="text-primary" />
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Encontre lugares perto de você</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use sua localização para encontrar bares e restaurantes que aceitam pedidos pelo FilaZero.
        </p>
      </div>

      {manualCity ? (
        <div className="flex w-full flex-col gap-3">
          <AuthInput label="Bairro, cidade ou região" value={city} onChange={(e) => setCity(e.target.value)} />
          <LoadingButton className="w-full" onClick={saveManualCity}>
            Continuar
          </LoadingButton>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          <LoadingButton className="w-full" loading={loading} onClick={useMyLocation}>
            Usar minha localização
          </LoadingButton>
          <LoadingButton variant="secondary" className="w-full" onClick={() => setManualCity(true)}>
            Escolher localização manualmente
          </LoadingButton>
        </div>
      )}
    </div>
  )
}
