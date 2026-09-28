import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AuthInput } from '../../components/ui/AuthInput'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { addressesService, type AddressInput } from '../../mock/services/addresses'
import { isMockApiError } from '../../mock/errors'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

function formatZip(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

const EMPTY: AddressInput = {
  label: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zip: '',
  isDefault: false,
}

// AddressFormScreen (spec história 13): mesmo formulário serve pra criar e
// editar (:addressId presente). "Referência opcional" da spec entra dentro de
// `complement` — o Address (spec §3, Fase 0) não tem uma coluna própria pra isso.
export function AddressFormScreen() {
  const navigate = useNavigate()
  const { addressId } = useParams()
  const isEditing = Boolean(addressId)

  const [form, setForm] = useState<AddressInput>(EMPTY)
  const [isCurrentDefault, setIsCurrentDefault] = useState(false)
  const [hasOtherAddresses, setHasOtherAddresses] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const existing = addressesService.list()
    setHasOtherAddresses(existing.length > 0)

    if (addressId) {
      try {
        const address = addressesService.get(addressId)
        setForm({
          label: address.label,
          street: address.street,
          number: address.number,
          complement: address.complement ?? '',
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          zip: formatZip(address.zip),
          isDefault: address.isDefault,
        })
        setIsCurrentDefault(address.isDefault)
      } catch (err) {
        setError(errorMessage(err))
      }
    }
  }, [addressId])

  function update<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    setError(null)
    setLoading(true)
    try {
      if (addressId) {
        addressesService.update(addressId, form)
      } else {
        addressesService.create(form)
      }
      navigate('/app/perfil/enderecos')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const canSave =
    form.label.trim().length > 0 &&
    form.street.trim().length > 0 &&
    form.number.trim().length > 0 &&
    form.neighborhood.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.state.trim().length === 2 &&
    form.zip.replace(/\D/g, '').length === 8

  return (
    <div className="flex flex-col px-6 py-8">
      <button type="button" onClick={() => navigate('/app/perfil/enderecos')} aria-label="Voltar" className="mb-6 w-fit text-foreground">
        <ArrowLeft size={22} />
      </button>

      <h1 className="mb-6 font-display text-xl font-bold text-foreground">{isEditing ? 'Editar endereço' : 'Novo endereço'}</h1>

      <div className="flex flex-col gap-5">
        <AuthInput label="Rótulo" placeholder="Casa, Trabalho..." value={form.label} onChange={(e) => update('label', e.target.value)} />
        <AuthInput
          label="CEP"
          placeholder="00000-000"
          inputMode="numeric"
          value={form.zip}
          onChange={(e) => update('zip', formatZip(e.target.value))}
        />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <AuthInput label="Rua" value={form.street} onChange={(e) => update('street', e.target.value)} />
          </div>
          <AuthInput label="Número" value={form.number} onChange={(e) => update('number', e.target.value)} />
        </div>
        <AuthInput
          label="Complemento / referência (opcional)"
          value={form.complement}
          onChange={(e) => update('complement', e.target.value)}
        />
        <AuthInput label="Bairro" value={form.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <AuthInput label="Cidade" value={form.city} onChange={(e) => update('city', e.target.value)} />
          </div>
          <AuthInput
            label="UF"
            maxLength={2}
            value={form.state}
            onChange={(e) => update('state', e.target.value.toUpperCase())}
          />
        </div>

        {isCurrentDefault ? (
          <p className="text-sm text-muted-foreground">Este é seu endereço padrão.</p>
        ) : hasOtherAddresses || isEditing ? (
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={Boolean(form.isDefault)}
              onChange={(e) => update('isDefault', e.target.checked)}
              className="h-5 w-5 shrink-0 accent-primary"
            />
            <span className="font-body text-sm text-foreground">Definir como padrão</span>
          </label>
        ) : (
          <p className="text-sm text-muted-foreground">Este será seu endereço padrão.</p>
        )}

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="pt-4">
          <LoadingButton className="w-full" loading={loading} disabled={!canSave} onClick={submit}>
            Salvar endereço
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}
