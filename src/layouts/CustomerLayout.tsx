import { NavLink, Outlet, useParams } from 'react-router-dom'
import { Home, Store, Receipt, User, UtensilsCrossed } from 'lucide-react'

// Barra inferior dinâmica (spec §7, RF §"Home e navegação"): sem restaurante
// ativo -> Início, Restaurantes, Pedidos, Perfil; dentro de um restaurante ->
// Início, Cardápio, Pedidos, Perfil.

function TabLink({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 py-2 px-3 text-xs font-body ${
          isActive ? 'text-primary' : 'text-muted-foreground'
        }`
      }
    >
      <Icon size={22} strokeWidth={2} />
      <span>{label}</span>
    </NavLink>
  )
}

export function CustomerLayout() {
  const { establishmentId } = useParams()

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-background">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-card">
        <div className="flex items-stretch justify-around">
          <TabLink to="/app" label="Início" icon={Home} />
          {establishmentId ? (
            <TabLink to={`/app/r/${establishmentId}/cardapio`} label="Cardápio" icon={UtensilsCrossed} />
          ) : (
            <TabLink to="/app/restaurantes" label="Restaurantes" icon={Store} />
          )}
          <TabLink to="/app/pedidos" label="Pedidos" icon={Receipt} />
          <TabLink to="/app/perfil" label="Perfil" icon={User} />
        </div>
      </nav>
    </div>
  )
}
