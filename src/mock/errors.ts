// MockApiError: mesmo vocabulário de códigos que uma API real usaria
// (spec §0.2 item 3, §4 "Convenções das funções mockadas"). "status" é só
// informativo aqui — não existe servidor HTTP para devolvê-lo de verdade.

export type MockApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'CPF_INVALID'
  | 'TERMS_REQUIRED'
  | 'CPF_ALREADY_REGISTERED'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'PHONE_ALREADY_REGISTERED'
  | 'INVALID_CREDENTIALS'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'ACCOUNT_SUSPENDED'
  | 'TOO_MANY_ATTEMPTS'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'USER_NOT_FOUND'
  | 'FEATURE_NOT_IN_PLAN'
  | 'PLAN_LIMIT_REACHED'
  | 'SESSION_EXPIRED'
  | 'CURRENT_PASSWORD_INVALID'
  | 'ADDRESS_LIMIT_REACHED'
  | 'PLAN_INACTIVE'
  | 'CANNOT_SUSPEND_SELF'
  | 'LAST_ADMIN_PROTECTED'
  | 'STAFF_REQUIRES_MEMBERSHIP'

export interface MockApiErrorDetails {
  [field: string]: unknown
}

export class MockApiError extends Error {
  code: MockApiErrorCode
  status: number
  details?: MockApiErrorDetails

  constructor(code: MockApiErrorCode, status: number, message: string, details?: MockApiErrorDetails) {
    super(message)
    this.name = 'MockApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

const MESSAGES: Record<MockApiErrorCode, string> = {
  VALIDATION_ERROR: 'Dados inválidos.',
  CPF_INVALID: 'CPF inválido.',
  TERMS_REQUIRED: 'É preciso aceitar os Termos de Uso e a Política de Privacidade.',
  CPF_ALREADY_REGISTERED: 'Este CPF já está cadastrado.',
  EMAIL_ALREADY_REGISTERED: 'Este e-mail já está cadastrado.',
  PHONE_ALREADY_REGISTERED: 'Este celular já está cadastrado.',
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  OTP_INVALID: 'Código incorreto.',
  OTP_EXPIRED: 'Código expirado. Peça um novo.',
  ACCOUNT_SUSPENDED: 'Sua conta está suspensa. Entre em contato com o suporte.',
  TOO_MANY_ATTEMPTS: 'Muitas tentativas. Peça um novo código.',
  UNAUTHENTICATED: 'Você precisa entrar na sua conta.',
  FORBIDDEN: 'Você não tem permissão para fazer isso.',
  NOT_FOUND: 'Não encontrado.',
  CONFLICT: 'Este registro já existe.',
  USER_NOT_FOUND: 'Nenhum usuário encontrado com este e-mail.',
  FEATURE_NOT_IN_PLAN: 'Recurso não incluso no seu plano.',
  PLAN_LIMIT_REACHED: 'Limite do plano atingido.',
  SESSION_EXPIRED: 'Sua sessão expirou.',
  CURRENT_PASSWORD_INVALID: 'Senha atual incorreta.',
  ADDRESS_LIMIT_REACHED: 'Limite de 10 endereços atingido.',
  PLAN_INACTIVE: 'Este plano está inativo e não pode ser atribuído.',
  CANNOT_SUSPEND_SELF: 'Você não pode suspender sua própria conta.',
  LAST_ADMIN_PROTECTED: 'Não é possível remover o último administrador ativo da plataforma.',
  STAFF_REQUIRES_MEMBERSHIP: 'Um usuário STAFF precisa de pelo menos um vínculo.',
}

/** Atalho: `throw apiError('CPF_INVALID')` usa a mensagem padrão em pt-BR. */
export function apiError(code: MockApiErrorCode, status: number, details?: MockApiErrorDetails): MockApiError {
  return new MockApiError(code, status, MESSAGES[code], details)
}

export function isMockApiError(err: unknown): err is MockApiError {
  return err instanceof MockApiError
}
