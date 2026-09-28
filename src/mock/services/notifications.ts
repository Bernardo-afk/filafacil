// NotificationService (spec §1.3 gancho): canal IN_APP nesta sprint; PUSH, SMS
// e WHATSAPP entram depois. Usado pela história 21 (waitlist.notified).

import { upsert, findAll } from '../storage'
import { newId, nowISO } from '../../lib/id'
import type { Notification, NotificationChannel } from '../types'

export interface NotificationService {
  send(input: {
    userId: string | null
    establishmentId: string | null
    type: string
    title: string
    body: string
    payload?: Record<string, unknown>
  }): Notification
}

function send(
  channel: NotificationChannel,
  input: { userId: string | null; establishmentId: string | null; type: string; title: string; body: string; payload?: Record<string, unknown> },
): Notification {
  const record: Notification = {
    id: newId(),
    userId: input.userId,
    establishmentId: input.establishmentId,
    channel,
    type: input.type,
    title: input.title,
    body: input.body,
    payload: input.payload ?? null,
    readAt: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
  return upsert('notifications', record)
}

export const inAppNotificationService: NotificationService = {
  send: (input) => send('IN_APP', input),
}

export function listNotificationsForUser(userId: string): Notification[] {
  return findAll<Notification>('notifications')
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
