// Admin · Estabelecimentos (história 34). Só PLATFORM_ADMIN chama qualquer
// função daqui — `requireRole` barra STAFF/CUSTOMER com 403 (spec: "Apenas
// admin acessa"). Contrato: GET /admin/establishments, POST
// /admin/establishments, PATCH /admin/establishments/:id, POST
// /admin/establishments/:id/status.

import { z } from 'zod'
import { findAll, findById, upsert } from '../storage'
import { apiError } from '../errors'
import { requireRole, requireSession } from '../guard'
import { useSessionStore } from '../session'
import { entitlements } from '../entitlements'
import { audit } from './audit'
import { newId, nowISO } from '../../lib/id'
import { matchesSearch } from '../../lib/text'
import { EstablishmentCategory, EstablishmentStatus } from '../types'
import type {
  Establishment,
  EstablishmentHours,
  Membership,
  Organization,
  Plan,
  Subscription,
  User,
} from '../types'

const CATEGORY_VALUES = Object.values(EstablishmentCategory) as [string, ...string[]]

function currentAdminId(): string {
  const session = requireSession(useSessionStore.getState().session)
  return requireRole(session, ['PLATFORM_ADMIN']).id
}

// ---------------------------------------------------------------------------
// Leitura (lista + detalhe)
// ---------------------------------------------------------------------------

function planCodeFor(organizationId: string): string | null {
  const subscription = findAll<Subscription>('subscriptions').find(
    (s) => s.organizationId === organizationId && (s.status === 'ACTIVE' || s.status === 'TRIAL'),
  )
  if (!subscription) return null
  return findById<Plan>('plans', subscription.planId)?.code ?? null
}

function managerNameFor(establishment: Establishment): string | null {
  const memberships = findAll<Membership>('memberships').filter(
    (m) =>
      m.role === 'MANAGER' &&
      (m.establishmentId === establishment.id || m.organizationId === establishment.organizationId),
  )
  const membership = memberships[0]
  if (!membership) return null
  return findById<User>('users', membership.userId)?.firstName ?? null
}

export interface AdminEstablishmentRow {
  id: string
  name: string
  unitLabel: string | null
  city: string
  planCode: string | null
  status: Establishment['status']
  createdAt: string
  /** "Volume hoje"/"Tickets abertos"/"Incidentes ativos" dependem de módulos futuros (spec história 34). */
  ticketsOpen: null
  volumeTodayCents: null
}

function toRow(establishment: Establishment): AdminEstablishmentRow {
  return {
    id: establishment.id,
    name: establishment.name,
    unitLabel: establishment.unitLabel,
    city: establishment.city,
    planCode: planCodeFor(establishment.organizationId),
    status: establishment.status,
    createdAt: establishment.createdAt,
    ticketsOpen: null,
    volumeTodayCents: null,
  }
}

export interface AdminEstablishmentDetail extends AdminEstablishmentRow {
  establishment: Establishment
  organizationName: string
  managerName: string | null
  incidentsActive: null
}

function toDetail(establishment: Establishment): AdminEstablishmentDetail {
  const organization = findById<Organization>('organizations', establishment.organizationId)
  return {
    ...toRow(establishment),
    establishment,
    organizationName: organization?.name ?? '—',
    managerName: managerNameFor(establishment),
    incidentsActive: null,
  }
}

export interface AdminEstablishmentFilters {
  q?: string
  status?: Establishment['status']
  planCode?: string
}

export const adminEstablishmentsService = {
  list(filters: AdminEstablishmentFilters = {}): AdminEstablishmentRow[] {
    currentAdminId()
    return findAll<Establishment>('establishments')
      .filter((e) => !filters.status || e.status === filters.status)
      .map(toRow)
      .filter((row) => !filters.planCode || row.planCode === filters.planCode)
      .filter((row) => !filters.q || matchesSearch(row.name, filters.q) || matchesSearch(row.city, filters.q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  /** Pra alimentar o seletor de organização existente no formulário "Novo". */
  listOrganizations(): Array<{ id: string; name: string }> {
    currentAdminId()
    return findAll<Organization>('organizations')
      .map((o) => ({ id: o.id, name: o.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  },

  /** Pra alimentar o seletor de "plano inicial" quando a organização é nova. */
  listPlans(): Array<{ id: string; code: string; name: string }> {
    currentAdminId()
    return findAll<Plan>('plans')
      .filter((p) => p.isActive)
      .map((p) => ({ id: p.id, code: p.code, name: p.name }))
  },

  get(id: string): AdminEstablishmentDetail {
    currentAdminId()
    const establishment = findById<Establishment>('establishments', id)
    if (!establishment) throw apiError('NOT_FOUND', 404)
    return toDetail(establishment)
  },

  // -------------------------------------------------------------------------
  // Criar
  // -------------------------------------------------------------------------

  create(input: CreateEstablishmentInput): AdminEstablishmentDetail {
    const adminId = currentAdminId()
    const parsed = createSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    const data = parsed.data

    const organization = resolveOrganization(data)
    const currentUnitCount = findAll<Establishment>('establishments').filter(
      (e) => e.organizationId === organization.id,
    ).length
    entitlements.assertUnitLimit(organization.id, currentUnitCount)

    const now = nowISO()
    const establishment: Establishment = {
      id: newId(),
      organizationId: organization.id,
      name: data.name,
      shortName: data.shortName || data.name,
      unitLabel: data.unitLabel || null,
      category: data.category as Establishment['category'],
      description: data.description ?? '',
      logoUrl: null,
      coverPhotoUrl: null,
      phone: data.phone || null,
      email: data.email || null,
      website: null,
      status: 'SETUP',
      statusReason: null,
      street: data.street,
      number: data.number,
      complement: data.complement || null,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state.toUpperCase(),
      zip: data.zip.replace(/\D/g, ''),
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      timezone: 'America/Sao_Paulo',
      tags: [],
      ratingAvg: 0,
      ratingCount: 0,
      waitMinMinutes: null,
      waitMaxMinutes: null,
      highDemand: false,
      ordersPausedAt: null,
      ordersPausedUntil: null,
      ordersPauseReason: null,
      avgTableTurnoverMin: 45,
      menuVersion: 0,
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    }
    upsert('establishments', establishment)

    if (data.managerEmail) {
      const manager = findAll<User>('users').find((u) => u.email === data.managerEmail)
      if (!manager) throw apiError('USER_NOT_FOUND', 404)
      upsert('memberships', {
        id: newId(),
        userId: manager.id,
        establishmentId: establishment.id,
        organizationId: null,
        role: 'MANAGER',
        createdAt: now,
        updatedAt: now,
      } satisfies Membership)
    }

    audit.log({
      actorUserId: adminId,
      establishmentId: establishment.id,
      entity: 'Establishment',
      entityId: establishment.id,
      action: 'CREATED',
      before: null,
      after: { name: establishment.name, organizationId: organization.id, status: establishment.status },
    })

    return toDetail(establishment)
  },

  // -------------------------------------------------------------------------
  // Editar dados cadastrais (sem mexer em status)
  // -------------------------------------------------------------------------

  update(id: string, input: CreateEstablishmentInput): AdminEstablishmentDetail {
    const adminId = currentAdminId()
    const current = findById<Establishment>('establishments', id)
    if (!current) throw apiError('NOT_FOUND', 404)

    const parsed = createSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    const data = parsed.data

    const updated: Establishment = {
      ...current,
      name: data.name,
      shortName: data.shortName || data.name,
      unitLabel: data.unitLabel || null,
      category: data.category as Establishment['category'],
      description: data.description ?? current.description,
      phone: data.phone || null,
      email: data.email || null,
      street: data.street,
      number: data.number,
      complement: data.complement || null,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state.toUpperCase(),
      zip: data.zip.replace(/\D/g, ''),
      lat: data.lat ?? current.lat,
      lng: data.lng ?? current.lng,
      updatedAt: nowISO(),
    }
    upsert('establishments', updated)

    audit.log({
      actorUserId: adminId,
      establishmentId: id,
      entity: 'Establishment',
      entityId: id,
      action: 'UPDATED',
      before: { name: current.name },
      after: { name: updated.name },
    })

    return toDetail(updated)
  },

  // -------------------------------------------------------------------------
  // Transição de status
  // -------------------------------------------------------------------------

  changeStatus(id: string, input: { status: Establishment['status']; reason?: string }): AdminEstablishmentDetail {
    const adminId = currentAdminId()
    const parsed = statusSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    const nextStatus = parsed.data.status as Establishment['status']
    const reason = parsed.data.reason

    const establishment = findById<Establishment>('establishments', id)
    if (!establishment) throw apiError('NOT_FOUND', 404)

    const allowedNext = TRANSITIONS[establishment.status]
    if (!allowedNext.includes(nextStatus)) {
      throw apiError('VALIDATION_ERROR', 400, { code: 'INVALID_TRANSITION', from: establishment.status, to: nextStatus })
    }

    // motivo obrigatório pra suspender (spec história 34, cenário "Motivo obrigatório para suspender")
    if (nextStatus === 'SUSPENDED' && !reason?.trim()) {
      throw apiError('VALIDATION_ERROR', 400, { field: 'reason' })
    }

    if (nextStatus === 'ACTIVE' && establishment.status === 'SETUP') {
      assertActivationChecklist(establishment)
    }

    const now = nowISO()
    const updated: Establishment = {
      ...establishment,
      status: nextStatus,
      statusReason: nextStatus === 'SUSPENDED' ? reason!.trim() : null,
      updatedAt: now,
    }
    upsert('establishments', updated)

    audit.log({
      actorUserId: adminId,
      establishmentId: id,
      entity: 'Establishment',
      entityId: id,
      action: 'STATUS_CHANGED',
      before: { status: establishment.status },
      after: { status: nextStatus, reason: reason ?? null },
    })

    return toDetail(updated)
  },
}

// ---------------------------------------------------------------------------
// Validação (zod)
// ---------------------------------------------------------------------------

const createSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório.').max(120),
    shortName: z.string().trim().max(60).optional(),
    unitLabel: z.string().trim().max(40).optional(),
    category: z.enum(CATEGORY_VALUES),
    description: z.string().trim().max(2000).optional(),
    phone: z.string().trim().max(20).optional(),
    email: z.string().trim().toLowerCase().email('E-mail inválido.').optional().or(z.literal('')),
    street: z.string().trim().min(1, 'Rua é obrigatória.').max(160),
    number: z.string().trim().min(1, 'Número é obrigatório.').max(20),
    complement: z.string().trim().max(120).optional(),
    neighborhood: z.string().trim().min(1, 'Bairro é obrigatório.').max(80),
    city: z.string().trim().min(1, 'Cidade é obrigatória.').max(80),
    state: z.string().trim().length(2, 'UF precisa ter 2 letras.'),
    zip: z.string().trim(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    organizationId: z.string().trim().optional(),
    organizationName: z.string().trim().max(120).optional(),
    planId: z.string().trim().optional(),
    managerEmail: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  })
  .transform((data) => ({
    ...data,
    email: data.email || undefined,
    managerEmail: data.managerEmail || undefined,
  }))

export type CreateEstablishmentInput = z.input<typeof createSchema>

const statusSchema = z.object({
  status: z.enum(Object.values(EstablishmentStatus) as [string, ...string[]]),
  reason: z.string().trim().max(500).optional(),
})

// ---------------------------------------------------------------------------
// Regras (spec história 34: transições, checklist de ativação, org/plano)
// ---------------------------------------------------------------------------

const TRANSITIONS: Record<Establishment['status'], Array<Establishment['status']>> = {
  SETUP: ['ACTIVE'],
  ACTIVE: ['SUSPENDED', 'DEACTIVATED'],
  SUSPENDED: ['ACTIVE'],
  DEACTIVATED: ['ACTIVE'],
}

/** ⚠️ regra inferida do checklist de ativação da spec: nome, endereço, lat/lng e horário de pedidos. */
function assertActivationChecklist(establishment: Establishment): void {
  const hasAddress = Boolean(establishment.street && establishment.number && establishment.neighborhood && establishment.city)
  const hasCoordinates = establishment.lat != null && establishment.lng != null
  const hasOrdersHours = findAll<EstablishmentHours>('establishmentHours').some(
    (h) => h.establishmentId === establishment.id && h.kind === 'ORDERS' && !h.isClosed,
  )
  if (!establishment.name.trim() || !hasAddress || !hasCoordinates || !hasOrdersHours) {
    throw apiError('VALIDATION_ERROR', 400, {
      code: 'ACTIVATION_INCOMPLETE',
      missing: {
        name: !establishment.name.trim(),
        address: !hasAddress,
        coordinates: !hasCoordinates,
        ordersHours: !hasOrdersHours,
      },
    })
  }
}

/** Organização existente (associa) ou nova (estabelecimento avulso ganha uma organização própria). */
function resolveOrganization(data: z.infer<typeof createSchema>): Organization {
  const now = nowISO()

  if (data.organizationId) {
    const organization = findById<Organization>('organizations', data.organizationId)
    if (!organization) throw apiError('NOT_FOUND', 404)
    ensureSubscription(organization.id, data.planId)
    return organization
  }

  const organization: Organization = {
    id: newId(),
    name: data.organizationName || data.name,
    createdAt: now,
    updatedAt: now,
  }
  upsert('organizations', organization)
  ensureSubscription(organization.id, data.planId)
  return organization
}

/** "A organização herda a assinatura existente; se não tiver, cria uma TRIAL no plano START" (ou no plano escolhido no formulário). */
function ensureSubscription(organizationId: string, requestedPlanId?: string): void {
  const existing = findAll<Subscription>('subscriptions').find((s) => s.organizationId === organizationId)
  if (existing) return

  const plan = findAll<Plan>('plans').find((p) => p.id === requestedPlanId) ?? findAll<Plan>('plans').find((p) => p.code === 'START')
  if (!plan) throw apiError('NOT_FOUND', 404)

  const now = nowISO()
  upsert('subscriptions', {
    id: newId(),
    organizationId,
    planId: plan.id,
    status: 'TRIAL',
    startedAt: now,
    endsAt: null,
    canceledAt: null,
    nextBillingAt: null,
    createdAt: now,
    updatedAt: now,
  } satisfies Subscription)
}
