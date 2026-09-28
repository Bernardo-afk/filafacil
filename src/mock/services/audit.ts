// audit.log(...) (spec §1.3 gancho, §3 AuditLog). Append-only: sem update/delete.

import { upsert } from '../storage'
import { newId, nowISO } from '../../lib/id'
import type { AuditLog } from '../types'

export interface AuditLogInput {
  actorUserId: string | null
  establishmentId: string | null
  entity: string
  entityId: string
  action: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

export const audit = {
  log(input: AuditLogInput): AuditLog {
    const record: AuditLog = {
      id: newId(),
      actorUserId: input.actorUserId,
      establishmentId: input.establishmentId,
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      before: input.before ?? null,
      after: input.after ?? null,
      ip: null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }
    return upsert('auditLogs', record)
  },
}
