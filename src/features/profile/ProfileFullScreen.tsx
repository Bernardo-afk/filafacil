import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User as UserIcon,
  MapPin,
  CreditCard,
  Receipt,
  CalendarClock,
  Heart,
  Gift,
  Bell,
  ShieldCheck,
  Accessibility,
  Utensils,
  HelpCircle,
  FileText,
  LogOut,
} from 'lucide-react'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { ProfileRow, ProfileSection } from './ProfileRow'
import { useCurrentUser } from './useCurrentUser'
import { authService } from '../../mock/services/auth'
import { formatBrazilianPhone } from '../../lib/phone'

// ProfileFullScreen (spec história 13): cabeçalho + grupos Sua conta / Sua
// atividade / Configurações + Sair. Linhas fora do escopo da Sprint 1 ficam
// desabilitadas com "Em breve" em vez de ocultas — mantém a estrutura visível.
export function ProfileFullScreen() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const [confirmingLogout, setConfirmingLogout] = useState(false)

  if (!user) return null

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()

  async function logout() {
    await authService.logout()
    navigate('/')
  }

  return (
    <div className="flex flex-col pb-8">
      <header className="flex flex-col items-center gap-3 bg-card px-6 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-xl font-bold text-primary-foreground">
          {initials || '?'}
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-foreground">
            {user.firstName} {user.lastName}
          </h1>
          {user.phoneE164 && <p className="text-sm text-muted-foreground">{formatBrazilianPhone(user.phoneE164)}</p>}
          {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
        </div>
        <LoadingButton variant="secondary" onClick={() => navigate('/app/perfil/editar')} className="px-5 py-2 text-sm">
          Editar perfil
        </LoadingButton>
      </header>

      <ProfileSection title="Sua conta">
        <ProfileRow icon={UserIcon} label="Dados pessoais" onClick={() => navigate('/app/perfil/editar')} />
        <ProfileRow icon={MapPin} label="Meus endereços" onClick={() => navigate('/app/perfil/enderecos')} />
        <ProfileRow icon={CreditCard} label="Pagamentos" disabled />
      </ProfileSection>

      <ProfileSection title="Sua atividade">
        <ProfileRow icon={Receipt} label="Pedidos" onClick={() => navigate('/app/pedidos')} />
        <ProfileRow icon={CalendarClock} label="Reservas" disabled />
        <ProfileRow icon={Heart} label="Favoritos" disabled />
        <ProfileRow icon={Gift} label="Benefícios" disabled />
      </ProfileSection>

      <ProfileSection title="Configurações">
        <ProfileRow icon={Bell} label="Notificações" disabled />
        <ProfileRow icon={ShieldCheck} label="Privacidade e conta" onClick={() => navigate('/app/perfil/conta')} />
        <ProfileRow icon={Accessibility} label="Acessibilidade" disabled />
        <ProfileRow icon={Utensils} label="Preferências alimentares" disabled />
        <ProfileRow icon={HelpCircle} label="Ajuda" disabled />
        <ProfileRow icon={FileText} label="Termos de uso" disabled />
      </ProfileSection>

      <div className="px-4 pt-5">
        <button
          type="button"
          onClick={() => setConfirmingLogout(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border bg-card px-4 py-3.5 font-body text-sm font-semibold text-error"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>

      {confirmingLogout && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40" role="dialog" aria-modal="true">
          <div className="mx-auto w-full max-w-[480px] rounded-t-[var(--radius-xl)] bg-card p-6">
            <h2 className="mb-2 font-display text-lg font-bold text-foreground">Deseja sair da sua conta?</h2>
            <p className="mb-6 text-sm text-muted-foreground">Você pode entrar novamente quando quiser.</p>
            <div className="flex flex-col gap-2">
              <LoadingButton className="w-full" onClick={logout}>
                Sair
              </LoadingButton>
              <LoadingButton variant="secondary" className="w-full" onClick={() => setConfirmingLogout(false)}>
                Cancelar
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
