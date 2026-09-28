import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AuthInput } from '../../components/ui/AuthInput'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { PasswordRequirements } from '../../components/ui/PasswordRequirements'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { TermsCheckbox } from '../../components/ui/TermsCheckbox'
import { OtpInput } from '../../components/ui/OtpInput'
import { authService } from '../../mock/services/auth'
import { otpService } from '../../mock/services/otp'
import { isMockApiError } from '../../mock/errors'
import { isValidCpf, formatCpf } from '../../lib/cpf'
import { isValidBrazilianMobile, formatBrazilianPhone, toE164 } from '../../lib/phone'
import { isValidPassword } from '../../lib/password'
import { useCountdown, formatCountdown } from '../../lib/useCountdown'

type Step = 'name' | 'contact-choose' | 'contact-phone' | 'contact-phone-otp' | 'contact-email' | 'cpf' | 'terms' | 'success'

interface SignupData {
  firstName: string
  lastName: string
  phone: string
  phoneVerificationToken: string | null
  email: string
  password: string
  confirmPassword: string
  cpf: string
  acceptTerms: boolean
  marketingOptIn: boolean
}

const INITIAL_DATA: SignupData = {
  firstName: '',
  lastName: '',
  phone: '',
  phoneVerificationToken: null,
  email: '',
  password: '',
  confirmPassword: '',
  cpf: '',
  acceptTerms: false,
  marketingOptIn: false,
}

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

export function SignupScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('name')
  const [data, setData] = useState<SignupData>(INITIAL_DATA)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devToast, setDevToast] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null)

  function update<K extends keyof SignupData>(key: K, value: SignupData[K]) {
    setData((d) => ({ ...d, [key]: value }))
  }

  function goBack() {
    setError(null)
    if (step === 'name') return navigate('/')
    if (step === 'contact-choose') return setStep('name')
    if (step === 'contact-phone' || step === 'contact-email') return setStep('contact-choose')
    if (step === 'contact-phone-otp') return setStep('contact-phone')
    if (step === 'cpf') return setStep(data.phone ? 'contact-phone-otp' : 'contact-email')
    if (step === 'terms') return setStep('cpf')
  }

  async function requestPhoneOtp() {
    setError(null)
    if (!isValidBrazilianMobile(data.phone)) {
      setError('Celular inválido.')
      return
    }
    setLoading(true)
    try {
      const result = await otpService.request(toE164(data.phone), 'SMS', 'SIGNUP')
      setDevToast(`Código de teste: ${result.devCode}`)
      setResendAvailableAt(result.resendAvailableAt)
      setOtpCode('')
      setStep('contact-phone-otp')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function verifyPhoneOtp() {
    setError(null)
    setLoading(true)
    try {
      const { verificationToken } = await otpService.verify(toE164(data.phone), otpCode, 'SIGNUP')
      update('phoneVerificationToken', verificationToken)
      setStep('cpf')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function submit() {
    setError(null)
    setLoading(true)
    try {
      await authService.register({
        firstName: data.firstName,
        lastName: data.lastName,
        cpf: data.cpf,
        email: data.email || undefined,
        phone: data.phone || undefined,
        password: data.password || undefined,
        verificationToken: data.phoneVerificationToken ?? undefined,
        acceptTerms: data.acceptTerms,
        marketingOptIn: data.marketingOptIn,
      })
      setStep('success')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-background px-6 py-8">
      {step !== 'success' && (
        <button type="button" onClick={goBack} aria-label="Voltar" className="mb-6 w-fit text-foreground">
          <ArrowLeft size={22} />
        </button>
      )}

      {devToast && (
        <div className="mb-4 rounded-[var(--radius-md)] bg-muted px-4 py-2 text-sm text-foreground">
          {devToast}
        </div>
      )}

      {step === 'name' && (
        <NameStep
          data={data}
          update={update}
          onContinue={() => setStep('contact-choose')}
        />
      )}

      {step === 'contact-choose' && (
        <ContactChooseStep
          onChoosePhone={() => setStep('contact-phone')}
          onChooseEmail={() => setStep('contact-email')}
        />
      )}

      {step === 'contact-phone' && (
        <ContactPhoneStep
          phone={data.phone}
          onChangePhone={(v) => update('phone', v)}
          error={error}
          loading={loading}
          onContinue={requestPhoneOtp}
        />
      )}

      {step === 'contact-phone-otp' && (
        <ContactPhoneOtpStep
          phone={data.phone}
          code={otpCode}
          onChangeCode={setOtpCode}
          error={error}
          loading={loading}
          resendAvailableAt={resendAvailableAt}
          onResend={requestPhoneOtp}
          onContinue={verifyPhoneOtp}
        />
      )}

      {step === 'contact-email' && (
        <ContactEmailStep
          data={data}
          update={update}
          error={error}
          onContinue={() => {
            setError(null)
            if (!/^\S+@\S+\.\S+$/.test(data.email)) return setError('E-mail inválido.')
            if (!isValidPassword(data.password)) return setError('A senha não atende aos requisitos.')
            if (data.password !== data.confirmPassword) return setError('As senhas não coincidem.')
            setStep('cpf')
          }}
        />
      )}

      {step === 'cpf' && (
        <CpfStep
          cpf={data.cpf}
          onChangeCpf={(v) => update('cpf', v)}
          error={error}
          onContinue={() => {
            setError(null)
            if (!isValidCpf(data.cpf)) return setError('CPF inválido.')
            setStep('terms')
          }}
        />
      )}

      {step === 'terms' && (
        <TermsStep
          data={data}
          update={update}
          error={error}
          loading={loading}
          onSubmit={submit}
        />
      )}

      {step === 'success' && <SuccessStep onContinue={() => navigate('/app')} />}
    </div>
  )
}

function StepTitle({ children, subtitle }: { children: string; subtitle?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      <h1 className="font-display text-xl font-bold text-foreground">{children}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

function NameStep({
  data,
  update,
  onContinue,
}: {
  data: SignupData
  update: <K extends keyof SignupData>(key: K, value: SignupData[K]) => void
  onContinue: () => void
}) {
  const canContinue = data.firstName.trim().length > 0 && data.lastName.trim().length > 0
  return (
    <div className="flex flex-1 flex-col gap-5">
      <StepTitle subtitle="Passo 1 de 4">Como podemos te chamar?</StepTitle>
      <AuthInput label="Nome" placeholder="Ex: Lucas" value={data.firstName} onChange={(e) => update('firstName', e.target.value)} />
      <AuthInput label="Sobrenome" placeholder="Ex: Torres" value={data.lastName} onChange={(e) => update('lastName', e.target.value)} />
      <div className="mt-auto pt-6">
        <LoadingButton className="w-full" disabled={!canContinue} onClick={onContinue}>
          Continuar
        </LoadingButton>
      </div>
    </div>
  )
}

function ContactChooseStep({ onChoosePhone, onChooseEmail }: { onChoosePhone: () => void; onChooseEmail: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <StepTitle subtitle="Passo 2 de 4">Como você quer entrar?</StepTitle>
      <LoadingButton variant="secondary" className="w-full" onClick={onChoosePhone}>
        Usar celular
      </LoadingButton>
      <LoadingButton variant="secondary" className="w-full" onClick={onChooseEmail}>
        Usar e-mail
      </LoadingButton>
    </div>
  )
}

function ContactPhoneStep({
  phone,
  onChangePhone,
  error,
  loading,
  onContinue,
}: {
  phone: string
  onChangePhone: (v: string) => void
  error: string | null
  loading: boolean
  onContinue: () => void
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <StepTitle subtitle="Enviaremos um código de 6 dígitos por SMS.">Qual seu celular?</StepTitle>
      <AuthInput
        label="Celular"
        placeholder="(19) 99999-9999"
        value={phone}
        onChange={(e) => onChangePhone(e.target.value)}
        error={error ?? undefined}
      />
      <div className="mt-auto pt-6">
        <LoadingButton className="w-full" loading={loading} disabled={phone.trim().length === 0} onClick={onContinue}>
          Continuar
        </LoadingButton>
      </div>
    </div>
  )
}

function ContactPhoneOtpStep({
  phone,
  code,
  onChangeCode,
  error,
  loading,
  resendAvailableAt,
  onResend,
  onContinue,
}: {
  phone: string
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
      <StepTitle subtitle={`Enviamos um código de 6 dígitos para ${formatBrazilianPhone(toE164(phone))}`}>
        Digite o código
      </StepTitle>
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

function ContactEmailStep({
  data,
  update,
  error,
  onContinue,
}: {
  data: SignupData
  update: <K extends keyof SignupData>(key: K, value: SignupData[K]) => void
  error: string | null
  onContinue: () => void
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <StepTitle subtitle="Passo 2 de 4">Crie sua senha</StepTitle>
      <AuthInput label="E-mail" type="email" placeholder="nome@email.com" value={data.email} onChange={(e) => update('email', e.target.value)} />
      <PasswordInput label="Senha" value={data.password} onChange={(e) => update('password', e.target.value)} />
      <PasswordRequirements password={data.password} />
      <PasswordInput
        label="Confirmar senha"
        value={data.confirmPassword}
        onChange={(e) => update('confirmPassword', e.target.value)}
      />
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="mt-auto pt-6">
        <LoadingButton className="w-full" onClick={onContinue}>
          Continuar
        </LoadingButton>
      </div>
    </div>
  )
}

function CpfStep({
  cpf,
  onChangeCpf,
  error,
  onContinue,
}: {
  cpf: string
  onChangeCpf: (v: string) => void
  error: string | null
  onContinue: () => void
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <StepTitle subtitle="Passo 3 de 4">Seu CPF</StepTitle>
      <AuthInput
        label="CPF"
        placeholder="000.000.000-00"
        value={cpf}
        onChange={(e) => onChangeCpf(formatCpf(e.target.value))}
        error={error ?? undefined}
        inputMode="numeric"
      />
      <div className="mt-auto pt-6">
        <LoadingButton className="w-full" disabled={cpf.trim().length === 0} onClick={onContinue}>
          Continuar
        </LoadingButton>
      </div>
    </div>
  )
}

function TermsStep({
  data,
  update,
  error,
  loading,
  onSubmit,
}: {
  data: SignupData
  update: <K extends keyof SignupData>(key: K, value: SignupData[K]) => void
  error: string | null
  loading: boolean
  onSubmit: () => void
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <StepTitle subtitle="Passo 4 de 4">Só mais uma coisa</StepTitle>
      <TermsCheckbox id="accept-terms" checked={data.acceptTerms} onChange={(v) => update('acceptTerms', v)}>
        Li e aceito os Termos de Uso e a Política de Privacidade.
      </TermsCheckbox>
      <TermsCheckbox id="marketing-opt-in" checked={data.marketingOptIn} onChange={(v) => update('marketingOptIn', v)}>
        Quero receber promoções e novidades.
      </TermsCheckbox>
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="mt-auto pt-6">
        <LoadingButton className="w-full" loading={loading} disabled={!data.acceptTerms} onClick={onSubmit}>
          Criar conta
        </LoadingButton>
      </div>
    </div>
  )
}

function SuccessStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <h1 className="font-display text-2xl font-bold text-foreground">Conta criada!</h1>
      <LoadingButton className="w-full" onClick={onContinue}>
        Continuar
      </LoadingButton>
    </div>
  )
}
