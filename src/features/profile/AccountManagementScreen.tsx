import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound, Mail, Phone, LogOut, Trash2 } from 'lucide-react'
import { AuthInput } from '../../components/ui/AuthInput'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { PasswordRequirements } from '../../components/ui/PasswordRequirements'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { OtpInput } from '../../components/ui/OtpInput'
import { ProfileRow, ProfileSection } from './ProfileRow'
import { useCurrentUser } from './useCurrentUser'
import { usersService } from '../../mock/services/users'
import { isMockApiError } from '../../mock/errors'
import { isValidPassword } from '../../lib/password'
import { formatBrazilianPhone, toE164 } from '../../lib/phone'
import { useCountdown, formatCountdown } from '../../lib/useCountdown'

type Panel = 'none' | 'password' | 'email' | 'phone' | 'logout-all-confirm'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

// AccountManagementScreen (spec história 13, "Privacidade e conta"): Alterar
// senha, Alterar e-mail e telefone (com verificação), Sair de todos os
// dispositivos. "Excluir minha conta" é a história 53 (Sprint 2).
export function AccountManagementScreen() {
  const navigate = useNavigate()
  const { user, reload } = useCurrentUser()
  const [panel, setPanel] = useState<Panel>('none')
  const [notice, setNotice] = useState<string | null>(null)

  if (!user) return null

  function closePanel() {
    setPanel('none')
  }

  function onChanged(message: string) {
    reload()
    setNotice(message)
    closePanel()
  }

  return (
    <div className="flex flex-col px-6 py-8">
      <button type="button" onClick={() => navigate('/app/perfil')} aria-label="Voltar" className="mb-6 w-fit text-foreground">
        <ArrowLeft size={22} />
      </button>

      <h1 className="mb-6 font-display text-xl font-bold text-foreground">Privacidade e conta</h1>

      {notice && <div className="mb-4 rounded-[var(--radius-md)] bg-success-bg px-4 py-2 text-sm text-success">{notice}</div>}

      {panel === 'none' && (
        <>
          <ProfileSection title="Segurança">
            <ProfileRow
              icon={KeyRound}
              label="Alterar senha"
              onClick={user.email ? () => setPanel('password') : undefined}
              disabled={!user.email}
              hint="Disponível apenas para contas com e-mail."
            />
            <ProfileRow icon={Mail} label={`Alterar e-mail${user.email ? ` (${user.email})` : ''}`} onClick={() => setPanel('email')} />
            <ProfileRow
              icon={Phone}
              label={`Alterar telefone${user.phoneE164 ? ` (${formatBrazilianPhone(user.phoneE164)})` : ''}`}
              onClick={() => setPanel('phone')}
            />
          </ProfileSection>

          <ProfileSection title="Dispositivos">
            <ProfileRow icon={LogOut} label="Sair de todos os dispositivos" onClick={() => setPanel('logout-all-confirm')} />
          </ProfileSection>

          <ProfileSection title="Conta">
            <ProfileRow icon={Trash2} label="Excluir minha conta" disabled hint="História 53 (Sprint 2)." tone="danger" />
          </ProfileSection>
        </>
      )}

      {panel === 'password' && <ChangePasswordPanel onBack={closePanel} onSuccess={() => onChanged('Senha alterada com sucesso.')} />}

      {panel === 'email' && (
        <ChangeContactPanel
          type="EMAIL"
          currentValue={user.email}
          onBack={closePanel}
          onSuccess={() => onChanged('E-mail alterado com sucesso.')}
        />
      )}

      {panel === 'phone' && (
        <ChangeContactPanel
          type="PHONE"
          currentValue={user.phoneE164}
          onBack={closePanel}
          onSuccess={() => onChanged('Celular alterado com sucesso.')}
        />
      )}

      {panel === 'logout-all-confirm' && (
        <LogoutAllPanel onBack={closePanel} onLoggedOut={() => navigate('/login')} />
      )}
    </div>
  )
}

function ChangePasswordPanel({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (!isValidPassword(newPassword)) {
      setError('A senha não atende aos requisitos.')
      return
    }
    setLoading(true)
    try {
      await usersService.changePassword({ currentPassword, newPassword })
      onSuccess()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PasswordInput label="Senha atual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
      <PasswordInput label="Nova senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      <PasswordRequirements password={newPassword} />
      <PasswordInput label="Confirmar nova senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="flex gap-2">
        <LoadingButton variant="secondary" className="flex-1" onClick={onBack}>
          Cancelar
        </LoadingButton>
        <LoadingButton
          className="flex-1"
          loading={loading}
          disabled={!currentPassword || !newPassword || !confirmPassword}
          onClick={submit}
        >
          Salvar
        </LoadingButton>
      </div>
    </div>
  )
}

function ChangeContactPanel({
  type,
  currentValue,
  onBack,
  onSuccess,
}: {
  type: 'EMAIL' | 'PHONE'
  currentValue: string | null
  onBack: () => void
  onSuccess: () => void
}) {
  const [step, setStep] = useState<'value' | 'otp'>('value')
  const [value, setValue] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devToast, setDevToast] = useState<string | null>(null)
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null)
  const secondsLeft = useCountdown(resendAvailableAt)

  const label = type === 'EMAIL' ? 'e-mail' : 'celular'
  const displayValue = type === 'EMAIL' ? value.trim().toLowerCase() : formatBrazilianPhone(toE164(value))

  async function requestCode() {
    setError(null)
    setLoading(true)
    try {
      const result = await usersService.requestContactChange({ type, value })
      setDevToast(`Código de teste: ${result.devCode}`)
      setResendAvailableAt(result.resendAvailableAt)
      setCode('')
      setStep('otp')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function confirmCode() {
    setError(null)
    setLoading(true)
    try {
      await usersService.confirmContactChange({ type, value, code })
      onSuccess()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (step === 'otp') {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">Enviamos um código de 6 dígitos para {displayValue}.</p>
        {devToast && <div className="rounded-[var(--radius-md)] bg-muted px-4 py-2 text-sm text-foreground">{devToast}</div>}
        <OtpInput value={code} onChange={setCode} error={Boolean(error)} disabled={loading} />
        {error && <p className="text-sm text-error">{error}</p>}
        <button
          type="button"
          onClick={requestCode}
          disabled={secondsLeft > 0}
          className="w-fit text-sm text-primary underline decoration-dotted disabled:text-muted-foreground disabled:no-underline"
        >
          {secondsLeft > 0 ? `Reenviar código em ${formatCountdown(secondsLeft)}` : 'Reenviar código'}
        </button>
        <div className="flex gap-2">
          <LoadingButton variant="secondary" className="flex-1" onClick={onBack}>
            Cancelar
          </LoadingButton>
          <LoadingButton className="flex-1" loading={loading} disabled={code.length !== 6} onClick={confirmCode}>
            Confirmar
          </LoadingButton>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {currentValue && <p className="text-sm text-muted-foreground">Atual: {type === 'EMAIL' ? currentValue : formatBrazilianPhone(currentValue)}</p>}
      <AuthInput
        label={`Novo ${label}`}
        type={type === 'EMAIL' ? 'email' : 'tel'}
        placeholder={type === 'EMAIL' ? 'novo@email.com' : '(19) 99999-9999'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={error ?? undefined}
      />
      <div className="flex gap-2">
        <LoadingButton variant="secondary" className="flex-1" onClick={onBack}>
          Cancelar
        </LoadingButton>
        <LoadingButton className="flex-1" loading={loading} disabled={value.trim().length === 0} onClick={requestCode}>
          Enviar código
        </LoadingButton>
      </div>
    </div>
  )
}

function LogoutAllPanel({ onBack, onLoggedOut }: { onBack: () => void; onLoggedOut: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setLoading(true)
    setError(null)
    try {
      await usersService.logoutAllDevices()
      onLoggedOut()
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Isso encerra sua sessão neste e em todos os outros aparelhos conectados à sua conta.
      </p>
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="flex gap-2">
        <LoadingButton variant="secondary" className="flex-1" onClick={onBack}>
          Cancelar
        </LoadingButton>
        <LoadingButton className="flex-1" loading={loading} onClick={confirm}>
          Sair de todos
        </LoadingButton>
      </div>
    </div>
  )
}
