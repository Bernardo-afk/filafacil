import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AuthInput } from '../../components/ui/AuthInput'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { useCurrentUser } from './useCurrentUser'
import { usersService } from '../../mock/services/users'
import { isMockApiError } from '../../mock/errors'
import { formatBrazilianPhone } from '../../lib/phone'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

// EditProfileScreen (spec história 13): nome e sobrenome são os únicos campos
// editáveis diretamente. Celular, e-mail e CPF aparecem só como referência —
// trocar celular/e-mail exige verificação e vive em "Privacidade e conta".
export function EditProfileScreen() {
  const navigate = useNavigate()
  const { user, reload } = useCurrentUser()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName)
      setLastName(user.lastName)
    }
  }, [user])

  if (!user) return null

  async function save() {
    setError(null)
    setLoading(true)
    try {
      await usersService.updateProfile({ firstName, lastName })
      reload()
      navigate('/app/perfil')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0

  return (
    <div className="flex flex-col px-6 py-8">
      <button type="button" onClick={() => navigate('/app/perfil')} aria-label="Voltar" className="mb-6 w-fit text-foreground">
        <ArrowLeft size={22} />
      </button>

      <h1 className="mb-6 font-display text-xl font-bold text-foreground">Editar perfil</h1>

      <div className="flex flex-col gap-5">
        <AuthInput label="Nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <AuthInput label="Sobrenome" value={lastName} onChange={(e) => setLastName(e.target.value)} />

        <AuthInput label="Celular" value={user.phoneE164 ? formatBrazilianPhone(user.phoneE164) : 'Não informado'} disabled readOnly />
        <AuthInput label="E-mail" value={user.email ?? 'Não informado'} disabled readOnly />
        <p className="-mt-3 text-sm text-muted-foreground">
          Para alterar celular ou e-mail, acesse{' '}
          <button type="button" onClick={() => navigate('/app/perfil/conta')} className="text-primary underline decoration-dotted">
            Privacidade e conta
          </button>
          .
        </p>

        {user.cpfMasked && (
          <AuthInput label="CPF" value={user.cpfMasked} disabled readOnly />
        )}
        {user.cpfMasked && <p className="-mt-3 text-sm text-muted-foreground">Para alterar, fale com o suporte.</p>}

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="pt-4">
          <LoadingButton className="w-full" loading={loading} disabled={!canSave} onClick={save}>
            Salvar
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}
