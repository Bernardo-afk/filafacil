import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Pencil, Trash2 } from 'lucide-react'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { addressesService } from '../../mock/services/addresses'
import { isMockApiError } from '../../mock/errors'
import type { Address } from '../../mock/types'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

// AddressesScreen (spec história 13, "Meus endereços"): até 10 endereços,
// exatamente 1 padrão. Trocar o padrão ou excluir refletem na hora, sem recarregar.
export function AddressesScreen() {
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState<Address[]>(() => addressesService.list())
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  function reload() {
    setAddresses(addressesService.list())
  }

  function setDefault(id: string) {
    setError(null)
    try {
      addressesService.setDefault(id)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function remove(id: string) {
    setError(null)
    try {
      addressesService.remove(id)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPendingDeleteId(null)
    }
  }

  const atLimit = addresses.length >= 10

  return (
    <div className="flex flex-col px-6 py-8">
      <button type="button" onClick={() => navigate('/app/perfil')} aria-label="Voltar" className="mb-6 w-fit text-foreground">
        <ArrowLeft size={22} />
      </button>

      <h1 className="mb-6 font-display text-xl font-bold text-foreground">Meus endereços</h1>

      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      {addresses.length === 0 && (
        <p className="mb-6 text-sm text-muted-foreground">Você ainda não tem endereços salvos.</p>
      )}

      <div className="flex flex-col gap-3">
        {addresses.map((address) => (
          <div key={address.id} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-body font-semibold text-foreground">{address.label}</span>
                  {address.isDefault && (
                    <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">Padrão</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {address.street}, {address.number}
                  {address.complement ? ` · ${address.complement}` : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  {address.neighborhood} · {address.city}/{address.state}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 pl-8">
              {!address.isDefault && (
                <button type="button" onClick={() => setDefault(address.id)} className="text-sm text-primary underline decoration-dotted">
                  Definir como padrão
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/app/perfil/enderecos/${address.id}/editar`)}
                className="flex items-center gap-1 text-sm text-foreground"
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                type="button"
                onClick={() => setPendingDeleteId(address.id)}
                className="flex items-center gap-1 text-sm text-error"
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6">
        <LoadingButton
          variant="secondary"
          className="w-full"
          disabled={atLimit}
          title={atLimit ? 'Limite de 10 endereços atingido.' : undefined}
          onClick={() => navigate('/app/perfil/enderecos/novo')}
        >
          + Novo endereço
        </LoadingButton>
      </div>

      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40" role="dialog" aria-modal="true">
          <div className="mx-auto w-full max-w-[480px] rounded-t-[var(--radius-xl)] bg-card p-6">
            <h2 className="mb-2 font-display text-lg font-bold text-foreground">Excluir este endereço?</h2>
            <p className="mb-6 text-sm text-muted-foreground">Essa ação não pode ser desfeita.</p>
            <div className="flex flex-col gap-2">
              <LoadingButton className="w-full" onClick={() => remove(pendingDeleteId)}>
                Excluir
              </LoadingButton>
              <LoadingButton variant="secondary" className="w-full" onClick={() => setPendingDeleteId(null)}>
                Cancelar
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
