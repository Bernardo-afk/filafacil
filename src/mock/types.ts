// Entidades e enums da Sprint 1 (spec §3). Cada Entidade vira uma coleção em
// localStorage sob a chave `filazero:<colecao>` (ver storage.ts). PK/FK/UNIQUE
// e "transação" são regras checadas em JS dentro dos mock services, não SQL.

export type ISODateTime = string // ISO-8601 UTC
export type ISODate = string // YYYY-MM-DD
export type UUID = string

export interface Timestamped {
  id: UUID
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  STAFF: 'STAFF',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
} as const
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]

export const MembershipRole = {
  ATTENDANT: 'ATTENDANT',
  RECEPTION: 'RECEPTION',
  WAITER: 'WAITER',
  KITCHEN: 'KITCHEN',
  CASHIER: 'CASHIER',
  SUPERVISOR: 'SUPERVISOR',
  MANAGER: 'MANAGER',
} as const
export type MembershipRole = (typeof MembershipRole)[keyof typeof MembershipRole]

export const EstablishmentStatus = {
  ACTIVE: 'ACTIVE',
  SETUP: 'SETUP',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
} as const
export type EstablishmentStatus = (typeof EstablishmentStatus)[keyof typeof EstablishmentStatus]

export const EstablishmentCategory = {
  BAR: 'BAR',
  RESTAURANT: 'RESTAURANT',
  BURGER_HOUSE: 'BURGER_HOUSE',
  PIZZERIA: 'PIZZERIA',
  CAFE: 'CAFE',
  SNACK_BAR: 'SNACK_BAR',
  CANTINA: 'CANTINA',
} as const
export type EstablishmentCategory = (typeof EstablishmentCategory)[keyof typeof EstablishmentCategory]

/** Derivado, nunca gravado. Ver Establishment.deriveOperationalStatus (services/establishments.ts). */
export const OperationalStatus = {
  OPEN: 'OPEN',
  BUSY: 'BUSY',
  PAUSED: 'PAUSED',
  CLOSED: 'CLOSED',
} as const
export type OperationalStatus = (typeof OperationalStatus)[keyof typeof OperationalStatus]

export const HoursKind = {
  BUSINESS: 'BUSINESS',
  ORDERS: 'ORDERS',
} as const
export type HoursKind = (typeof HoursKind)[keyof typeof HoursKind]

export const SubscriptionStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
} as const
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export const BillingPeriod = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const
export type BillingPeriod = (typeof BillingPeriod)[keyof typeof BillingPeriod]

export const PlanFeatureKey = {
  MAX_UNITS: 'MAX_UNITS',
  KDS: 'KDS',
  LOYALTY: 'LOYALTY',
  ADVANCED_REPORTS: 'ADVANCED_REPORTS',
  API_ACCESS: 'API_ACCESS',
  MULTI_UNIT: 'MULTI_UNIT',
  DEDICATED_SLA: 'DEDICATED_SLA',
  ACCOUNT_MANAGER: 'ACCOUNT_MANAGER',
  WHITE_LABEL: 'WHITE_LABEL',
  PROMOTIONS: 'PROMOTIONS',
  RECIPE_SHEETS: 'RECIPE_SHEETS',
  WAITLIST: 'WAITLIST',
} as const
export type PlanFeatureKey = (typeof PlanFeatureKey)[keyof typeof PlanFeatureKey]

export const PromotionScope = {
  ALL: 'ALL',
  CATEGORIES: 'CATEGORIES',
  ITEMS: 'ITEMS',
} as const
export type PromotionScope = (typeof PromotionScope)[keyof typeof PromotionScope]

export const DiscountType = {
  PERCENT: 'PERCENT',
  FIXED_PRICE_CENTS: 'FIXED_PRICE_CENTS',
} as const
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType]

export const IngredientUnit = {
  UN: 'UN',
  G: 'G',
  KG: 'KG',
  ML: 'ML',
  L: 'L',
  CX: 'CX',
  PCT: 'PCT',
} as const
export type IngredientUnit = (typeof IngredientUnit)[keyof typeof IngredientUnit]

export const LocationType = {
  TABLE: 'TABLE',
  COUNTER: 'COUNTER',
  AREA_ZONE: 'AREA_ZONE',
  PICKUP_POINT: 'PICKUP_POINT',
} as const
export type LocationType = (typeof LocationType)[keyof typeof LocationType]

export const TableShape = {
  SQUARE: 'SQUARE',
  ROUND: 'ROUND',
  RECTANGLE: 'RECTANGLE',
} as const
export type TableShape = (typeof TableShape)[keyof typeof TableShape]

export const TableStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  CALLING: 'CALLING',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  UNAVAILABLE: 'UNAVAILABLE',
} as const
export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus]

export const WaitlistStatus = {
  WAITING: 'WAITING',
  NOTIFIED: 'NOTIFIED',
  SEATED: 'SEATED',
  NO_SHOW: 'NO_SHOW',
  CANCELED: 'CANCELED',
} as const
export type WaitlistStatus = (typeof WaitlistStatus)[keyof typeof WaitlistStatus]

export const NotificationChannel = {
  IN_APP: 'IN_APP',
} as const
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel]

export const OAuthProvider = {
  GOOGLE: 'GOOGLE',
  APPLE: 'APPLE',
} as const
export type OAuthProvider = (typeof OAuthProvider)[keyof typeof OAuthProvider]

export const OtpPurpose = {
  LOGIN: 'LOGIN',
  SIGNUP: 'SIGNUP',
  CHANGE_CONTACT: 'CHANGE_CONTACT',
} as const
export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose]

// ---------------------------------------------------------------------------
// Entidades
// ---------------------------------------------------------------------------

export interface User extends Timestamped {
  firstName: string
  lastName: string
  email: string | null
  emailVerifiedAt: ISODateTime | null
  phoneE164: string | null
  phoneVerifiedAt: ISODateTime | null
  /** modo mock: nunca é um hash real (spec §0.2 item 7). */
  passwordHash: string | null
  /** 🔶 nulo se o grupo decidir tirar o CPF do cadastro. */
  cpfEncrypted: string | null
  cpfHash: string | null
  role: UserRole
  status: UserStatus
  tokenVersion: number
  consentVersion: string | null
  consentAcceptedAt: ISODateTime | null
  marketingOptIn: boolean
  ageConfirmedAt: ISODateTime | null
  lastLoginAt: ISODateTime | null
  deletedAt: ISODateTime | null
  anonymizedAt: ISODateTime | null
}

export interface OtpChallenge extends Timestamped {
  identifier: string
  channel: 'SMS' | 'EMAIL'
  purpose: OtpPurpose
  codeHash: string
  expiresAt: ISODateTime
  attempts: number
  consumedAt: ISODateTime | null
  resendAvailableAt: ISODateTime
}

export interface OAuthAccount extends Timestamped {
  userId: UUID
  provider: OAuthProvider
  providerUserId: string
  email: string
}

export interface RefreshToken extends Timestamped {
  userId: UUID
  tokenHash: string
  familyId: UUID
  expiresAt: ISODateTime
  revokedAt: ISODateTime | null
  userAgent: string | null
  ip: string | null
}

export interface Address extends Timestamped {
  userId: UUID
  label: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zip: string
  lat: number | null
  lng: number | null
  isDefault: boolean
}

export interface Organization extends Timestamped {
  name: string
}

export interface Establishment extends Timestamped {
  organizationId: UUID
  name: string
  shortName: string
  unitLabel: string | null
  category: EstablishmentCategory
  description: string
  logoUrl: string | null
  coverPhotoUrl: string | null
  phone: string | null
  email: string | null
  website: string | null
  status: EstablishmentStatus
  statusReason: string | null
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zip: string
  lat: number | null
  lng: number | null
  timezone: string
  tags: string[]
  ratingAvg: number
  ratingCount: number
  waitMinMinutes: number | null
  waitMaxMinutes: number | null
  highDemand: boolean
  ordersPausedAt: ISODateTime | null
  ordersPausedUntil: ISODateTime | null
  ordersPauseReason: string | null
  avgTableTurnoverMin: number
  menuVersion: number
  createdBy: UUID | null
}

export interface EstablishmentHours extends Timestamped {
  establishmentId: UUID
  kind: HoursKind
  weekday: number // 0 domingo .. 6 sabado
  opensAt: string | null // "HH:mm"
  closesAt: string | null
  isClosed: boolean
}

export interface EstablishmentSpecialHours extends Timestamped {
  establishmentId: UUID
  kind: HoursKind
  date: ISODate
  isClosed: boolean
  opensAt: string | null
  closesAt: string | null
}

export interface EstablishmentPhoto extends Timestamped {
  establishmentId: UUID
  url: string
  sortOrder: number
}

export interface Membership extends Timestamped {
  userId: UUID
  establishmentId: UUID | null
  organizationId: UUID | null
  role: MembershipRole
}

export interface Plan extends Timestamped {
  code: string
  name: string
  priceCents: number
  billingPeriod: BillingPeriod
  isActive: boolean
}

export interface PlanFeature extends Timestamped {
  planId: UUID
  key: PlanFeatureKey
  intValue: number | null
  boolValue: boolean | null
}

export interface Subscription extends Timestamped {
  organizationId: UUID
  planId: UUID
  status: SubscriptionStatus
  startedAt: ISODateTime
  endsAt: ISODateTime | null
  canceledAt: ISODateTime | null
  nextBillingAt: ISODateTime | null
}

export interface MenuCategory extends Timestamped {
  establishmentId: UUID
  name: string
  sortOrder: number
  isActive: boolean
}

export interface MenuItem extends Timestamped {
  establishmentId: UUID
  categoryId: UUID
  name: string
  description: string
  priceCents: number
  photoUrl: string | null
  isAvailable: boolean
  isFeatured: boolean
  isActive: boolean
  sortOrder: number
  prepStation: string | null
  prepTimeMin: number | null
  deletedAt: ISODateTime | null
}

export interface Promotion extends Timestamped {
  establishmentId: UUID
  name: string
  scope: PromotionScope
  discountType: DiscountType
  discountValue: number
  weekdays: number[]
  startTime: string // "HH:mm"
  endTime: string
  validFrom: ISODate | null
  validUntil: ISODate | null
  label: string
  isActive: boolean
  createdBy: UUID | null
}

export interface PromotionTarget extends Timestamped {
  promotionId: UUID
  menuItemId: UUID | null
  categoryId: UUID | null
}

export interface Ingredient extends Timestamped {
  establishmentId: UUID
  name: string
  purchaseUnit: IngredientUnit
  unitCostCents: number
  deletedAt: ISODateTime | null
}

export interface RecipeSheet extends Timestamped {
  establishmentId: UUID
  menuItemId: UUID
  yieldPortions: number
  method: string | null
  maxCostPercent: number
}

export interface RecipeSheetLine extends Timestamped {
  recipeSheetId: UUID
  ingredientId: UUID
  quantity: number
  unit: IngredientUnit
}

export interface Area extends Timestamped {
  establishmentId: UUID
  name: string
  sortOrder: number
  isActive: boolean
}

export interface FloorPlan extends Timestamped {
  establishmentId: UUID
  name: string
  gridCols: number
  gridRows: number
}

export interface DiningTable extends Timestamped {
  establishmentId: UUID
  areaId: UUID
  floorPlanId: UUID
  type: LocationType
  code: string
  label: string
  capacity: number | null
  shape: TableShape
  gridX: number
  gridY: number
  gridW: number
  gridH: number
  status: TableStatus
  qrToken: string
  isActive: boolean
}

export interface WaitlistEntry extends Timestamped {
  establishmentId: UUID
  userId: UUID | null
  customerName: string
  phoneE164: string
  partySize: number
  status: WaitlistStatus
  position: number
  estimatedWaitMinutes: number | null
  notifiedAt: ISODateTime | null
  seatedAt: ISODateTime | null
  canceledAt: ISODateTime | null
  notifiedTableId: UUID | null
  seatedTableId: UUID | null
}

export interface Notification extends Timestamped {
  userId: UUID | null
  establishmentId: UUID | null
  channel: NotificationChannel
  type: string
  title: string
  body: string
  payload: Record<string, unknown> | null
  readAt: ISODateTime | null
}

export interface AuditLog extends Timestamped {
  actorUserId: UUID | null
  establishmentId: UUID | null
  entity: string
  entityId: UUID
  action: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip: string | null
}

// ---------------------------------------------------------------------------
// Sessão (spec §4, decisão 2) — sem JWT real
// ---------------------------------------------------------------------------

export interface Session {
  userId: UUID
  role: UserRole
  /** estabelecimento ativo (para MANAGER/ATTENDANT com vínculo por organização) */
  activeEstablishmentId: UUID | null
  expiresAt: ISODateTime
}
