import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AuthInput } from '../../components/ui/AuthInput'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { OtpInput } from '../../components/ui/OtpInput'
import { authService } from '../../mock/services/auth'
import { listStaffAccess, pathForMembershipRole } from '../../mock/services/membership'
import { isMockApiError } from '../../mock/errors'
import { looksLikeEmail, formatBrazilianPhone, toE164 } from '../../lib/phone'
import { useCountdown, formatCountdown } from '../../lib/useCountdown'
import { flags } from '../../lib/flags'
import type { SafeUser } from '../../mock/services/users'

type Step = 'identifier' | 'phone-otp' | 'email-password'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

/** Para onde ir depois de logar (spec história 06 "Redirecionamento por papel"). */
export function landingPathFor(user: SafeUser): string {
  if (user.role === 'PLATFORM_ADMIN') return '/admin'
  if (user.role === 'CUSTOMER') return '/app'
  const access = listStaffAccess(user.id)
  if (access.length === 1) return pathForMembershipRole(access[0].role)
  return '/escolher-estabelecimento'
}

export function LoginScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('identifier')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devToast, setDevToast] = useState<string | null>(null)
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null)

  const isEmail = looksLikeEmail(identifier)

  function afterLogin(user: SafeUser) {
    navigate(landingPathFor(user))
  }

  async function continueFromIdentifier() {
    setError(null)
    if (isEmail) {
      setStep('email-password')
      return
    }
    setLoading(true)
    try {
      const result = await authService.requestLoginOtp(identifier)
      setDevToast(`Código de teste: ${result.devCode}`)
      setResendAvailableAt(result.resendAvailableAt)
      setOtpCode('')
      setStep('phone-otp')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    setError(null)
    setLoading(true)
    try {
      const { user } = await authService.loginWithOtp(identifier, otpCode)
      afterLogin(user)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function submitEmailLogin() {
    setError(null)
    setLoading(true)
    try {
      const { user } = await authService.login({ email: identifier, password })
      afterLogin(user)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function goBack() {
    setError(null)
    if (step === 'identifier') return navigate('/')
    setStep('identifier')
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-background px-6 py-8">
      <button type="button" onClick={goBack} aria-label="Voltar" className="mb-6 w-fit text-foreground">
        <ArrowLeft size={22} />
      </button>

      {devToast && (
        <div className="mb-4 rounded-[var(--radius-md)] bg-muted px-4 py-2 text-sm text-foreground">{devToast}</div>
      )}

      {step === 'identifier' && (
        <div className="flex flex-1 flex-col gap-5">
          <div className="mb-2 flex flex-col gap-1">
            <h1 className="font-display text-xl font-bold text-foreground">Entre na sua conta</h1>
            <p className="text-sm text-muted-foreground">Continue de onde parou e acompanhe seus pedidos.</p>
          </div>
          <AuthInput
            label="Celular ou e-mail"
            placeholder="(19) 99999-9999 ou nome@email.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={error ?? undefined}
          />
          <LoadingButton
            className="w-full"
            loading={loading}
            disabled={identifier.trim().length === 0}
            onClick={continueFromIdentifier}
          >
            Continuar
          </LoadingButton>

          <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>
          <LoadingButton variant="secondary" className="w-full" disabled title={flags.AUTH_GOOGLE_ENABLED ? undefined : 'Em breve'}>
            Continuar com Google
          </LoadingButton>
          <LoadingButton variant="secondary" className="w-full" disabled title={flags.AUTH_APPLE_ENABLED ? undefined : 'Em breve'}>
            Continuar com Apple
          </LoadingButton>

          <p className="mt-auto pt-6 text-center text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link to="/cadastro" className="text-primary underline decoration-dotted">
              Criar conta
            </Link>
          </p>
        </div>
      )}

      {step === 'phone-otp' && (
        <PhoneOtpStep
          identifier={identifier}
          code={otpCode}
          onChangeCode={setOtpCode}
          error={error}
          loading={loading}
          resendAvailableAt={resendAvailableAt}
          onResend={continueFromIdentifier}
          onContinue={verifyOtp}
        />
      )}

      {step === 'email-password' && (
        <div className="flex flex-1 flex-col gap-5">
          <div className="mb-2 flex flex-col gap-1">
            <h1 className="font-display text-xl font-bold text-foreground">{identifier}</h1>
          </div>
          <PasswordInput label="Senha" value={password} onChange={(e) => setPassword(e.target.value)} error={error ?? undefined} />
          <button type="button" disabled className="w-fit text-sm text-muted-foreground" title="História 44 (Sprint 2)">
            Esqueci minha senha
          </button>
          <LoadingButton className="w-full" loading={loading} disabled={password.length === 0} onClick={submitEmailLogin}>
            Entrar
          </LoadingButton>
        </div>
      )}
    </div>
  )
}

function PhoneOtpStep({
  identifier,
  code,
  onChangeCode,
  error,
  loading,
  resendAvailableAt,
  onResend,
  onContinue,
}: {
  identifier: string
  code: string
  onChangeCode: (v: string) => void
  error: string | null
  loading: boolean
  resendAvailableAt: string | null
  onResend: () => void
  onContinue: () => void
}) {
  const secondsLeft = useCountdown(resendAvailableAt)
  const canResend = secondsLeft <= 0
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="mb-2 flex flex-col gap-1">
        <h1 className="font-display text-xl font-bold text-foreground">Digite o código</h1>
        <p className="text-sm text-muted-foreground">
          Enviamos um código de 6 dígitos para {formatBrazilianPhone(toE164(identifier))}
        </p>
      </div>
      <OtpInput value={code} onChange={onChangeCode} error={Boolean(error)} disabled={loading} />
      {error && <p className="text-sm text-error">{error}</p>}
      <button
        type="button"
        onClick={onResend}
        disabled={!canResend}
        className="w-fit text-sm text-primary underline decoration-dotted disabled:text-muted-foreground disabled:no-underline"
      >
        {canResend ? 'Reenviar código' : `Reenviar código em ${formatCountdown(secondsLeft)}`}
      </button>
      <div className="mt-auto pt-6">
        <LoadingButton className="w-full" loading={loading} disabled={code.length !== 6} onClick={onContinue}>
          Continuar
        </LoadingButton>
      </div>
    </div>
  )
}
