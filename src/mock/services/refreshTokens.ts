// Revogação de refresh tokens por usuário — usado tanto por
// usersService.logoutAllDevices (o próprio usuário) quanto por
// adminUsersService.suspend (um admin suspendendo outra conta, história 36).

import { getCollection, setCollection } from '../storage'
import { nowISO } from '../../lib/id'
import type { RefreshToken } from '../types'

export function revokeAllRefreshTokensFor(userId: string): void {
  const now = nowISO()
  const collection = getCollection<RefreshToken>('refreshTokens')
  for (const token of Object.values(collection)) {
    if (token.userId === userId && !token.revokedAt) {
      collection[token.id] = { ...token, revokedAt: now, updatedAt: now }
    }
  }
  setCollection('refreshTokens', collection)
}
