import { Link } from 'react-router-dom'
import { flags } from '../../lib/flags'
import { FilaZeroLogo } from '../../components/brand/Logo'
import { resetMockData } from '../../mock/reset'

// Boas-vindas (spec §5, história 01, EntryAuth.tsx): "Peça. Acompanhe. Retire."
// Cadastro, login e "Explorar restaurantes" ainda não existem (histórias 01/06/11);
// por ora só a navegação de desenvolvimento para as áreas por papel.

export function WelcomeScreen() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-between bg-background px-6 py-16 text-center">
      <div />
      <div className="flex flex-col items-center gap-4">
        <FilaZeroLogo size={40} wordmarkSize="lg" />
        <p className="font-display text-lg text-muted-foreground">Peça. Acompanhe. Retire.</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        {flags.ORDERING_ENABLED && (
          <button
            type="button"
            className="rounded-full bg-primary px-6 py-3 font-body font-semibold text-primary-foreground"
          >
            Escanear QR Code
          </button>
        )}
        <Link
          to="/login"
          className="rounded-full border border-border bg-card px-6 py-3 text-center font-body font-semibold text-foreground"
        >
          Entrar
        </Link>
        <Link to="/cadastro" className="text-sm text-primary underline decoration-dotted">
          Ainda não tem conta? Criar conta
        </Link>
        <Link to="/app" className="text-sm text-primary underline decoration-dotted">
          Explorar restaurantes
        </Link>
      </div>

      {import.meta.env.DEV && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="w-full">Atalhos de desenvolvimento (não fazem parte do produto):</span>
          <Link to="/atendente/cardapio" className="underline">
            Atendente
          </Link>
          <Link to="/gestor" className="underline">
            Gestor
          </Link>
          <Link to="/admin" className="underline">
            Admin
          </Link>
          <button
            type="button"
            className="underline"
            onClick={() => {
              resetMockData()
              window.location.reload()
            }}
          >
            Resetar dados
          </button>
        </div>
      )}
    </div>
  )
}
