import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AuthInput } from '../../components/ui/AuthInput'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { adminPlansService, type AdminPlanInput } from '../../mock/services/adminPlans'
import { isMockApiError } from '../../mock/errors'
import { FEATURE_LABELS, BOOLEAN_FEATURE_KEYS } from './planFeatureLabels'
import { centsFromReais } from '../../lib/money'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

const EMPTY: AdminPlanInput = {
  code: '',
  name: '',
  priceCents: 0,
  billingPeriod: 'MONTHLY',
  isActive: true,
  maxUnits: 1,
  features: Object.fromEntries(BOOLEAN_FEATURE_KEYS.map((key) => [key, false])),
}

// Formulário de plano (spec história 37: nome, preço, recursos, limite de
// unidades, ativo). Mesma tela cria e edita (:planId presente).
export function PlanFormScreen() {
  const navigate = useNavigate()
  const { planId } = useParams()
  const isEditing = Boolean(planId)

  const [form, setForm] = useState<AdminPlanInput>(EMPTY)
  const [priceReais, setPriceReais] = useState('0')
  const [unlimited, setUnlimited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!planId) return
    try {
      const { plan, maxUnits, features } = adminPlansService.get(planId)
      setForm({
        code: plan.code,
        name: plan.name,
        priceCents: plan.priceCents,
        billingPeriod: plan.billingPeriod,
        isActive: plan.isActive,
        maxUnits,
        features,
      })
      setPriceReais((plan.priceCents / 100).toFixed(2))
      setUnlimited(maxUnits === null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [planId])

  function update<K extends keyof AdminPlanInput>(key: K, value: AdminPlanInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    setError(null)
    setLoading(true)
    try {
      const input: AdminPlanInput = { ...form, maxUnits: unlimited ? null : form.maxUnits }
      if (planId) {
        adminPlansService.update(planId, input)
      } else {
        adminPlansService.create(input)
      }
      navigate('/admin/planos')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const canSave = form.code.trim().length > 0 && form.name.trim().length > 0 && (unlimited || (form.maxUnits ?? 0) >= 1)

  return (
    <div className="flex flex-col p-8">
      <button
        type="button"
        onClick={() => navigate('/admin/planos')}
        className="mb-6 flex w-fit items-center gap-2 text-sm font-semibold text-foreground"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <h1 className="mb-6 font-display text-xl font-bold text-foreground">{isEditing ? 'Editar plano' : 'Novo plano'}</h1>

      <div className="flex max-w-xl flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <AuthInput label="Código" placeholder="START" value={form.code} onChange={(e) => update('code', e.target.value.toUpperCase())} />
          <AuthInput label="Nome" placeholder="FilaZero Start" value={form.name} onChange={(e) => update('name', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <AuthInput
            label="Preço (R$)"
            type="number"
            min={0}
            step="0.01"
            value={priceReais}
            onChange={(e) => {
              setPriceReais(e.target.value)
              update('priceCents', centsFromReais(Number(e.target.value) || 0))
            }}
          />
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-sm font-medium text-foreground">Cobrança</span>
            <select
              value={form.billingPeriod}
              onChange={(e) => update('billingPeriod', e.target.value as AdminPlanInput['billingPeriod'])}
              className="rounded-[var(--radius-md)] border border-border px-4 py-3 font-body text-base text-foreground outline-none focus:border-primary"
            >
              <option value="MONTHLY">Mensal</option>
              <option value="YEARLY">Anual</option>
            </select>
          </label>
        </div>

        <div className="flex items-end gap-4">
          <AuthInput
            label="Limite de unidades"
            type="number"
            min={1}
            disabled={unlimited}
            value={unlimited ? '' : (form.maxUnits ?? 1)}
            onChange={(e) => update('maxUnits', Number(e.target.value) || 1)}
          />
          <label className="mb-3.5 flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} className="h-5 w-5 accent-primary" />
            <span className="font-body text-sm text-foreground">Ilimitado</span>
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={form.isActive} onChange={(e) => update('isActive', e.target.checked)} className="h-5 w-5 accent-primary" />
          <span className="font-body text-sm text-foreground">Plano ativo (pode ser atribuído a organizações)</span>
        </label>

        <div>
          <h2 className="mb-2 font-body text-sm font-semibold text-foreground">Recursos incluídos</h2>
          <div className="grid grid-cols-2 gap-2">
            {BOOLEAN_FEATURE_KEYS.map((key) => (
              <label key={key} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.features[key])}
                  onChange={(e) => update('features', { ...form.features, [key]: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                <span className="font-body text-sm text-foreground">{FEATURE_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="pt-2">
          <LoadingButton loading={loading} disabled={!canSave} onClick={submit}>
            Salvar
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}
