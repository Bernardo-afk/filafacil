// Monta todas as coleções do seed (spec §8) para o reset.ts gravar em localStorage.

import type {
  Address,
  Area,
  AuditLog,
  DiningTable,
  Establishment,
  EstablishmentHours,
  EstablishmentPhoto,
  EstablishmentSpecialHours,
  FloorPlan,
  Ingredient,
  MenuCategory,
  MenuItem,
  Membership,
  Notification,
  OAuthAccount,
  Organization,
  OtpChallenge,
  Plan,
  PlanFeature,
  Promotion,
  PromotionTarget,
  RecipeSheet,
  RecipeSheetLine,
  RefreshToken,
  Subscription,
  WaitlistEntry,
} from '../types'
import type { CollectionName } from '../storage'

import { buildUsers } from './users'
import { buildAddresses } from './addresses'
import { buildOrganizations } from './organizations'
import { buildPlans, buildPlanFeatures } from './plans'
import { buildSubscriptions } from './subscriptions'
import { buildMemberships } from './memberships'
import { buildEstablishments } from './establishments'
import { buildEstablishmentHours, buildEstablishmentSpecialHours } from './hours'
import { buildMenuCategories, buildMenuItems } from './menu'
import { buildPromotions, buildPromotionTargets } from './promotions'
import { buildIngredients, buildRecipeSheets, buildRecipeSheetLines } from './ingredients'
import { buildAreas, buildFloorPlans, buildDiningTables } from './floorplan'
import { buildWaitlistEntries } from './waitlist'
import { buildLoadTestEstablishments, loadTestEnabled } from './loadTest'

export interface SeedData {
  users: ReturnType<typeof buildUsers>
  addresses: Address[]
  organizations: Organization[]
  plans: Plan[]
  planFeatures: PlanFeature[]
  subscriptions: Subscription[]
  memberships: Membership[]
  establishments: Establishment[]
  establishmentHours: EstablishmentHours[]
  establishmentSpecialHours: EstablishmentSpecialHours[]
  establishmentPhotos: EstablishmentPhoto[]
  menuCategories: MenuCategory[]
  menuItems: MenuItem[]
  promotions: Promotion[]
  promotionTargets: PromotionTarget[]
  ingredients: Ingredient[]
  recipeSheets: RecipeSheet[]
  recipeSheetLines: RecipeSheetLine[]
  areas: Area[]
  floorPlans: FloorPlan[]
  diningTables: DiningTable[]
  waitlistEntries: WaitlistEntry[]
  otpChallenges: OtpChallenge[]
  oauthAccounts: OAuthAccount[]
  refreshTokens: RefreshToken[]
  notifications: Notification[]
  auditLogs: AuditLog[]
}

export function buildSeed(): SeedData {
  const establishments = buildEstablishments()
  if (loadTestEnabled()) {
    establishments.push(...buildLoadTestEstablishments())
  }

  return {
    users: buildUsers(),
    addresses: buildAddresses(),
    organizations: buildOrganizations(),
    plans: buildPlans(),
    planFeatures: buildPlanFeatures(),
    subscriptions: buildSubscriptions(),
    memberships: buildMemberships(),
    establishments,
    establishmentHours: buildEstablishmentHours(),
    establishmentSpecialHours: buildEstablishmentSpecialHours(),
    establishmentPhotos: [],
    menuCategories: buildMenuCategories(),
    menuItems: buildMenuItems(),
    promotions: buildPromotions(),
    promotionTargets: buildPromotionTargets(),
    ingredients: buildIngredients(),
    recipeSheets: buildRecipeSheets(),
    recipeSheetLines: buildRecipeSheetLines(),
    areas: buildAreas(),
    floorPlans: buildFloorPlans(),
    diningTables: buildDiningTables(),
    waitlistEntries: buildWaitlistEntries(),
    otpChallenges: [],
    oauthAccounts: [],
    refreshTokens: [],
    notifications: [],
    auditLogs: [],
  }
}

/** Mapeia cada chave do SeedData para o nome da coleção em storage.ts. */
export const SEED_COLLECTION_MAP: Record<keyof SeedData, CollectionName> = {
  users: 'users',
  addresses: 'addresses',
  organizations: 'organizations',
  plans: 'plans',
  planFeatures: 'planFeatures',
  subscriptions: 'subscriptions',
  memberships: 'memberships',
  establishments: 'establishments',
  establishmentHours: 'establishmentHours',
  establishmentSpecialHours: 'establishmentSpecialHours',
  establishmentPhotos: 'establishmentPhotos',
  menuCategories: 'menuCategories',
  menuItems: 'menuItems',
  promotions: 'promotions',
  promotionTargets: 'promotionTargets',
  ingredients: 'ingredients',
  recipeSheets: 'recipeSheets',
  recipeSheetLines: 'recipeSheetLines',
  areas: 'areas',
  floorPlans: 'floorPlans',
  diningTables: 'diningTables',
  waitlistEntries: 'waitlistEntries',
  otpChallenges: 'otpChallenges',
  oauthAccounts: 'oauthAccounts',
  refreshTokens: 'refreshTokens',
  notifications: 'notifications',
  auditLogs: 'auditLogs',
}
