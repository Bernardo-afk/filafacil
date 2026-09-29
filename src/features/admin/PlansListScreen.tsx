import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, Plus } from 'lucide-react'
import { AdminHeader } from './AdminHeader'
import { adminPlansService, type AdminPlanDetail } from '../../mock/services/adminPlans'
import { FEATURE_LABELS, BOOLEAN_FEATURE_KEYS } from './planFeatureLabels'
import { formatCents } from '../../lib/money'

// Admin · Planos (spec história 37): "❌ não há tela — proposta: lista de
// cartões dos 3 planos + edição (nome, preço, recursos, limite de unidades, ativo)".
export function PlansListScreen() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<AdminPlanDetail[]>([])

  function reload() {
    setPlans(adminPlansService.list())
  }

  useEffect(reload, [])

  return (
    <div className="flex flex-col">
      <AdminHeader title="Planos" onRefresh={reload} />

      <div className="flex flex-col gap-4 p-4 sm:p-6 md:p-8">
        <button
          type="button"
          onClick={() => navigate('/admin/planos/novo')}
          className="flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Plus size={16} />
          Novo plano
        </button>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map(({ plan, maxUnits, features }) => (
            <div key={plan.id} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.code}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    plan.isActive ? 'bg-success-bg text-success' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {plan.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <p className="font-display text-2xl font-bold text-foreground">
                {formatCents(plan.priceCents)}
                <span className="text-sm font-normal text-muted-foreground">
                  /{plan.billingPeriod === 'MONTHLY' ? 'mês' : 'ano'}
                </span>
              </p>

              <p className="text-sm text-foreground">
                {maxUnits === null ? 'Unidades ilimitadas' : `Até ${maxUnits} unidade${maxUnits > 1 ? 's' : ''}`}
              </p>

              <ul className="flex flex-col gap-1">
                {BOOLEAN_FEATURE_KEYS.map((key) => (
                  <li key={key} className="flex items-center gap-1.5 text-sm">
                    {features[key] ? (
                      <Check size={14} className="text-success" />
                    ) : (
                      <X size={14} className="text-muted-foreground" />
                    )}
                    <span className={features[key] ? 'text-foreground' : 'text-muted-foreground'}>{FEATURE_LABELS[key]}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => navigate(`/admin/planos/${plan.id}/editar`)}
                className="mt-auto w-fit text-sm font-semibold text-primary underline decoration-dotted"
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
