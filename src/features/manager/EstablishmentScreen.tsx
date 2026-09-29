import { useEffect, useState } from 'react'
import { Star, MapPin } from 'lucide-react'
import { AuthInput } from '../../components/ui/AuthInput'
import { LoadingButton } from '../../components/ui/LoadingButton'
import {
  managerEstablishmentService,
  PAUSE_REASON_OPTIONS,
  type ManagerEstablishmentInfoInput,
} from '../../mock/services/managerEstablishment'
import { isMockApiError } from '../../mock/errors'
import { useSessionStore } from '../../mock/session'
import { EstablishmentCategory } from '../../mock/types'
import type { Establishment } from '../../mock/types'
import { CATEGORY_LABELS } from '../../lib/establishmentCategory'

const DURATION_OPTIONS: Array<{ label: string; minutes: number | null }> = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hora', minutes: 60 },
  { label: 'Até eu reativar', minutes: null },
]

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

function formatZip(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

const EMPTY: ManagerEstablishmentInfoInput = {
  name: '',
  shortName: '',
  category: 'BAR',
  phone: '',
  email: '',
  description: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zip: '',
}

// EstablishmentSection do gestor (spec história 12): informações básicas,
// localização e preview público — mais pausar/retomar pedidos (a API e o
// status entram nesta história; o dashboard completo é de outra sprint).
export function EstablishmentScreen() {
  const activeEstablishmentId = useSessionStore((s) => s.session?.activeEstablishmentId ?? null)
  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [form, setForm] = useState<ManagerEstablishmentInfoInput>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [pausing, setPausing] = useState(false)
  const [pauseDuration, setPauseDuration] = useState<number | null>(15)
  const [pauseReason, setPauseReason] = useState('')

  function reload() {
    if (!activeEstablishmentId) return
    try {
      const { establishment: e } = managerEstablishmentService.get(activeEstablishmentId)
      setEstablishment(e)
      setForm({
        name: e.name,
        shortName: e.shortName,
        category: e.category,
        phone: e.phone ?? '',
        email: e.email ?? '',
        description: e.description,
        street: e.street,
        number: e.number,
        complement: e.complement ?? '',
        neighborhood: e.neighborhood,
        city: e.city,
        state: e.state,
        zip: formatZip(e.zip),
        lat: e.lat ?? undefined,
        lng: e.lng ?? undefined,
      })
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(reload, [activeEstablishmentId])

  function update<K extends keyof ManagerEstablishmentInfoInput>(key: K, value: ManagerEstablishmentInfoInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save() {
    if (!activeEstablishmentId) return
    setError(null)
    setNotice(null)
    setLoading(true)
    try {
      managerEstablishmentService.updateInfo(activeEstablishmentId, form)
      setNotice('Dados salvos.')
      reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function pauseOrders() {
    if (!activeEstablishmentId) return
    setError(null)
    try {
      managerEstablishmentService.pauseOrders(activeEstablishmentId, { durationMinutes: pauseDuration, reason: pauseReason || undefined })
      setPausing(false)
      setPauseReason('')
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function resumeOrders() {
    if (!activeEstablishmentId) return
    setError(null)
    try {
      managerEstablishmentService.resumeOrders(activeEstablishmentId)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (!activeEstablishmentId) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <p className="text-sm text-muted-foreground">Selecione um estabelecimento para continuar.</p>
      </div>
    )
  }
  if (!establishment) return null

  const isPaused = Boolean(establishment.ordersPausedAt)

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 md:p-8">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Estabelecimento</h1>
        <p className="text-sm text-muted-foreground">Informações básicas e localização.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="flex max-w-2xl flex-col gap-5">
          <h2 className="font-body text-sm font-semibold text-foreground">Informações básicas</h2>
          <div className="grid grid-cols-2 gap-4">
            <AuthInput label="Nome do estabelecimento" value={form.name} onChange={(e) => update('name', e.target.value)} />
            <AuthInput label="Nome curto" value={form.shortName} onChange={(e) => update('shortName', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AuthInput label="Telefone" value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
            <AuthInput label="E-mail" type="email" value={form.email ?? ''} onChange={(e) => update('email', e.target.value)} />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-sm font-medium text-foreground">Categoria</span>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value as ManagerEstablishmentInfoInput['category'])}
              className="rounded-[var(--radius-md)] border border-border px-4 py-3 font-body text-base text-foreground outline-none focus:border-primary"
            >
              {Object.values(EstablishmentCategory).map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-sm font-medium text-foreground">Descrição</span>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => update('description', e.target.value)}
              rows={3}
              className="rounded-[var(--radius-md)] border border-border p-3 font-body text-sm text-foreground outline-none focus:border-primary"
            />
          </label>

          <h2 className="font-body text-sm font-semibold text-foreground">Localização</h2>
          <div className="grid grid-cols-3 gap-4">
            <AuthInput label="CEP" value={form.zip} onChange={(e) => update('zip', formatZip(e.target.value))} />
            <div className="col-span-2">
              <AuthInput label="Endereço" value={form.street} onChange={(e) => update('street', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <AuthInput label="Número" value={form.number} onChange={(e) => update('number', e.target.value)} />
            <AuthInput label="Bairro" value={form.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} />
            <AuthInput label="Cidade" value={form.city} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <AuthInput label="UF" maxLength={2} value={form.state} onChange={(e) => update('state', e.target.value.toUpperCase())} />
            <AuthInput
              label="Latitude"
              type="number"
              value={form.lat ?? ''}
              onChange={(e) => update('lat', e.target.value === '' ? undefined : Number(e.target.value))}
            />
            <AuthInput
              label="Longitude"
              type="number"
              value={form.lng ?? ''}
              onChange={(e) => update('lng', e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </div>
          <p className="text-xs text-muted-foreground">Sem mapa interativo no modo mock — ajuste latitude/longitude diretamente.</p>

          {notice && <p className="text-sm text-success">{notice}</p>}
          {error && <p className="text-sm text-error">{error}</p>}

          <div>
            <LoadingButton loading={loading} onClick={save}>
              Salvar
            </LoadingButton>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h2 className="mb-2 font-body text-sm font-semibold text-foreground">Preview público</h2>
            <p className="mb-2 text-xs text-muted-foreground">É assim que seu estabelecimento aparece no FilaZero.</p>
            <div className="rounded-[var(--radius-md)] border border-border bg-card p-4">
              <p className="font-display font-bold text-foreground">
                {form.name}
                {establishment.unitLabel ? ` · ${establishment.unitLabel}` : ''}
              </p>
              <p className="text-sm text-muted-foreground">{CATEGORY_LABELS[form.category as keyof typeof CATEGORY_LABELS]}</p>
              <p className="mt-2 flex items-center gap-1 text-sm text-foreground">
                <Star size={14} className="fill-primary text-primary" />
                {establishment.ratingAvg.toFixed(1)} ({establishment.ratingCount})
              </p>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin size={14} />
                {form.street}, {form.number} · {form.neighborhood}
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-2 font-body text-sm font-semibold text-foreground">Pedidos</h2>
            {isPaused ? (
              <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Pedidos pausados</p>
                {establishment.ordersPauseReason && <p className="text-sm text-muted-foreground">Motivo: {establishment.ordersPauseReason}</p>}
                <LoadingButton onClick={resumeOrders}>Retomar pedidos agora</LoadingButton>
              </div>
            ) : pausing ? (
              <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Por quanto tempo deseja pausar?</p>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setPauseDuration(opt.minutes)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                        pauseDuration === opt.minutes ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="font-body text-sm font-medium text-foreground">Motivo (opcional)</span>
                  <select
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">Selecione…</option>
                    {PAUSE_REASON_OPTIONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-2">
                  <LoadingButton variant="secondary" className="flex-1" onClick={() => setPausing(false)}>
                    Cancelar
                  </LoadingButton>
                  <LoadingButton className="flex-1" onClick={pauseOrders}>
                    Pausar
                  </LoadingButton>
                </div>
              </div>
            ) : (
              <LoadingButton variant="secondary" className="w-full" onClick={() => setPausing(true)}>
                Pausar pedidos
              </LoadingButton>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
