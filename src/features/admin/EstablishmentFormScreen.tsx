import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AuthInput } from '../../components/ui/AuthInput'
import { LoadingButton } from '../../components/ui/LoadingButton'
import {
  adminEstablishmentsService,
  type CreateEstablishmentInput,
} from '../../mock/services/adminEstablishments'
import { isMockApiError } from '../../mock/errors'
import { EstablishmentCategory } from '../../mock/types'
import { CATEGORY_LABELS } from '../../lib/establishmentCategory'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

function formatZip(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

const EMPTY: CreateEstablishmentInput = {
  name: '',
  shortName: '',
  unitLabel: '',
  category: 'BAR',
  phone: '',
  email: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zip: '',
  organizationId: '',
  organizationName: '',
  planId: '',
  managerEmail: '',
}

// Formulário do botão "Novo" (spec história 34, "❌ não desenhado — proposta:
// mesmos campos da tela Estabelecimento do gestor + organização/plano/gestor").
// Mesma tela serve pra editar (:establishmentId presente), sem os campos de
// organização/plano/gestor — o service não deixa trocar isso via update.
export function EstablishmentFormScreen() {
  const navigate = useNavigate()
  const { establishmentId } = useParams()
  const isEditing = Boolean(establishmentId)

  const [form, setForm] = useState<CreateEstablishmentInput>(EMPTY)
  const [newOrg, setNewOrg] = useState(true)
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([])
  const [plans, setPlans] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setOrganizations(adminEstablishmentsService.listOrganizations())
    setPlans(adminEstablishmentsService.listPlans())

    if (establishmentId) {
      try {
        const { establishment } = adminEstablishmentsService.get(establishmentId)
        setForm({
          name: establishment.name,
          shortName: establishment.shortName,
          unitLabel: establishment.unitLabel ?? '',
          category: establishment.category,
          phone: establishment.phone ?? '',
          email: establishment.email ?? '',
          street: establishment.street,
          number: establishment.number,
          complement: establishment.complement ?? '',
          neighborhood: establishment.neighborhood,
          city: establishment.city,
          state: establishment.state,
          zip: formatZip(establishment.zip),
          lat: establishment.lat ?? undefined,
          lng: establishment.lng ?? undefined,
        })
      } catch (err) {
        setError(errorMessage(err))
      }
    }
  }, [establishmentId])

  function update<K extends keyof CreateEstablishmentInput>(key: K, value: CreateEstablishmentInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    setError(null)
    setLoading(true)
    try {
      const input: CreateEstablishmentInput = {
        ...form,
        organizationId: newOrg ? undefined : form.organizationId,
        organizationName: newOrg ? form.organizationName : undefined,
        planId: newOrg ? form.planId : undefined,
      }
      const detail = establishmentId
        ? adminEstablishmentsService.update(establishmentId, input)
        : adminEstablishmentsService.create(input)
      navigate(`/admin/estabelecimentos/${detail.establishment.id}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const canSave =
    form.name.trim().length > 0 &&
    form.street.trim().length > 0 &&
    form.number.trim().length > 0 &&
    form.neighborhood.trim().length > 0 &&
    form.city.trim().length > 0 &&
    (form.state ?? '').trim().length === 2 &&
    (isEditing || newOrg ? true : Boolean(form.organizationId))

  return (
    <div className="flex flex-col p-4 sm:p-6 md:p-8">
      <button
        type="button"
        onClick={() => navigate('/admin/estabelecimentos')}
        className="mb-6 flex w-fit items-center gap-2 text-sm font-semibold text-foreground"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <h1 className="mb-6 font-display text-xl font-bold text-foreground">
        {isEditing ? 'Editar estabelecimento' : 'Novo estabelecimento'}
      </h1>

      <div className="flex max-w-2xl flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <AuthInput label="Nome" value={form.name} onChange={(e) => update('name', e.target.value)} />
          <AuthInput label="Nome curto" value={form.shortName ?? ''} onChange={(e) => update('shortName', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <AuthInput label="Rótulo da unidade (opcional)" value={form.unitLabel ?? ''} onChange={(e) => update('unitLabel', e.target.value)} />
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-sm font-medium text-foreground">Categoria</span>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value as CreateEstablishmentInput['category'])}
              className="rounded-[var(--radius-md)] border border-border px-4 py-3 font-body text-base text-foreground outline-none focus:border-primary"
            >
              {Object.values(EstablishmentCategory).map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <AuthInput label="Telefone" value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
          <AuthInput label="E-mail" type="email" value={form.email ?? ''} onChange={(e) => update('email', e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <AuthInput label="Rua" value={form.street} onChange={(e) => update('street', e.target.value)} />
          </div>
          <AuthInput label="Número" value={form.number} onChange={(e) => update('number', e.target.value)} />
        </div>
        <AuthInput label="Complemento (opcional)" value={form.complement ?? ''} onChange={(e) => update('complement', e.target.value)} />
        <div className="grid grid-cols-3 gap-4">
          <AuthInput label="Bairro" value={form.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} />
          <AuthInput label="Cidade" value={form.city} onChange={(e) => update('city', e.target.value)} />
          <AuthInput label="UF" maxLength={2} value={form.state} onChange={(e) => update('state', e.target.value.toUpperCase())} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <AuthInput label="CEP" value={form.zip} onChange={(e) => update('zip', formatZip(e.target.value))} />
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

        {!isEditing && (
          <>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewOrg(true)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${newOrg ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'}`}
              >
                Nova organização
              </button>
              <button
                type="button"
                onClick={() => setNewOrg(false)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${!newOrg ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'}`}
              >
                Organização existente
              </button>
            </div>

            {newOrg ? (
              <div className="grid grid-cols-2 gap-4">
                <AuthInput
                  label="Nome da organização (opcional)"
                  placeholder={form.name || 'Usa o nome do estabelecimento'}
                  value={form.organizationName ?? ''}
                  onChange={(e) => update('organizationName', e.target.value)}
                />
                <label className="flex flex-col gap-1.5">
                  <span className="font-body text-sm font-medium text-foreground">Plano inicial</span>
                  <select
                    value={form.planId ?? ''}
                    onChange={(e) => update('planId', e.target.value)}
                    className="rounded-[var(--radius-md)] border border-border px-4 py-3 font-body text-base text-foreground outline-none focus:border-primary"
                  >
                    <option value="">Start (padrão)</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <label className="flex flex-col gap-1.5">
                <span className="font-body text-sm font-medium text-foreground">Organização</span>
                <select
                  value={form.organizationId ?? ''}
                  onChange={(e) => update('organizationId', e.target.value)}
                  className="rounded-[var(--radius-md)] border border-border px-4 py-3 font-body text-base text-foreground outline-none focus:border-primary"
                >
                  <option value="">Selecione…</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <AuthInput
              label="E-mail do gestor responsável (opcional)"
              type="email"
              placeholder="gestor@email.com"
              value={form.managerEmail ?? ''}
              onChange={(e) => update('managerEmail', e.target.value)}
            />
          </>
        )}

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="pt-4">
          <LoadingButton loading={loading} disabled={!canSave} onClick={submit}>
            Salvar
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}
