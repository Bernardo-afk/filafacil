import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye } from 'lucide-react'
import { AdminHeader } from './AdminHeader'
import { StatusBadge, PlanBadge } from './statusBadge'
import { LoadingButton } from '../../components/ui/LoadingButton'
import {
  adminEstablishmentsService,
  type AdminEstablishmentDetail,
} from '../../mock/services/adminEstablishments'
import { isMockApiError } from '../../mock/errors'
import type { Establishment } from '../../mock/types'

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-card p-4">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-display text-lg font-semibold text-foreground">{value}</span>
    </div>
  )
}

// Painel de detalhe (spec história 34): dados do estabelecimento + ações de
// status. Vira tela própria (não painel lateral) na ausência do protótipo.
export function EstablishmentDetailScreen() {
  const navigate = useNavigate()
  const { establishmentId } = useParams()
  const [detail, setDetail] = useState<AdminEstablishmentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState<string | null>(null)
  const [suspendError, setSuspendError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const reload = useCallback(() => {
    if (!establishmentId) return
    try {
      setDetail(adminEstablishmentsService.get(establishmentId))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [establishmentId])

  useEffect(() => {
    reload()
  }, [reload])

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-error">{error}</p>
      </div>
    )
  }
  if (!detail) return null

  async function changeStatus(status: Establishment['status'], reason?: string) {
    if (!establishmentId) return
    setLoading(true)
    setError(null)
    try {
      adminEstablishmentsService.changeStatus(establishmentId, { status, reason })
      setSuspendReason(null)
      setSuspendError(null)
      reload()
    } catch (err) {
      if (suspendReason !== null) setSuspendError(errorMessage(err))
      else setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const { establishment } = detail

  return (
    <div className="flex flex-col">
      <AdminHeader title="Detalhe do estabelecimento" onRefresh={reload} />

      <div className="flex flex-col gap-6 p-8">
        <button
          type="button"
          onClick={() => navigate('/admin/estabelecimentos')}
          className="flex w-fit items-center gap-2 text-sm font-semibold text-foreground"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              {establishment.name}
              {establishment.unitLabel ? ` · ${establishment.unitLabel}` : ''}
            </h2>
            <p className="text-sm text-muted-foreground">{detail.organizationName}</p>
          </div>
          <div className="flex items-center gap-2">
            <PlanBadge code={detail.planCode} />
            <StatusBadge status={establishment.status} />
          </div>
        </div>

        {establishment.status === 'SUSPENDED' && establishment.statusReason && (
          <p className="rounded-[var(--radius-md)] bg-error-bg px-4 py-3 text-sm text-error">
            Motivo da suspensão: {establishment.statusReason}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Cidade" value={establishment.city} />
          <Stat label="Gestor" value={detail.managerName ?? '—'} />
          <Stat label="Membro desde" value={DATE_FORMAT.format(new Date(establishment.createdAt))} />
          <Stat label="Volume hoje" value="—" />
          <Stat label="Tickets abertos" value="—" />
          <Stat label="Incidentes ativos" value="—" />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <LoadingButton
            variant="secondary"
            onClick={() => navigate(`/admin/estabelecimentos/${establishment.id}/editar`)}
          >
            Editar
          </LoadingButton>
          <LoadingButton variant="secondary" disabled title="Sessão somente leitura auditada — futuro">
            <Eye size={16} />
            Abrir como gestor
          </LoadingButton>

          {establishment.status === 'SETUP' && (
            <LoadingButton loading={loading} onClick={() => changeStatus('ACTIVE')}>
              Ativar
            </LoadingButton>
          )}
          {establishment.status === 'ACTIVE' && (
            <>
              <LoadingButton loading={loading} variant="secondary" onClick={() => setSuspendReason('')}>
                Suspender
              </LoadingButton>
              <LoadingButton loading={loading} variant="secondary" onClick={() => changeStatus('DEACTIVATED')}>
                Desativar
              </LoadingButton>
            </>
          )}
          {(establishment.status === 'SUSPENDED' || establishment.status === 'DEACTIVATED') && (
            <LoadingButton loading={loading} onClick={() => changeStatus('ACTIVE')}>
              Reativar
            </LoadingButton>
          )}
        </div>
      </div>

      {suspendReason !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-[var(--radius-xl)] bg-card p-6">
            <h3 className="mb-2 font-display text-lg font-bold text-foreground">Suspender estabelecimento</h3>
            <p className="mb-4 text-sm text-muted-foreground">Informe o motivo da suspensão.</p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              className="mb-2 w-full rounded-[var(--radius-md)] border border-border p-3 text-sm text-foreground outline-none focus:border-primary"
              placeholder="Ex.: violação das regras de uso"
            />
            {suspendError && <p className="mb-2 text-sm text-error">{suspendError}</p>}
            <div className="flex gap-2">
              <LoadingButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setSuspendReason(null)
                  setSuspendError(null)
                }}
              >
                Cancelar
              </LoadingButton>
              <LoadingButton
                className="flex-1"
                loading={loading}
                disabled={suspendReason.trim().length === 0}
                onClick={() => changeStatus('SUSPENDED', suspendReason)}
              >
                Suspender
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
