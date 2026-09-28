import { NavLink, Outlet } from 'react-router-dom'
import { Store, Users as UsersIcon, CreditCard } from 'lucide-react'
import { FilaZeroLogo } from '../components/brand/Logo'

// Admin · plataforma (spec §7, história 34): sidebar escura 208px. Na Sprint 1
// ative só Estabelecimentos, Usuários e Planos (os demais itens do protótipo
// — Organizações, Pagamentos, Suporte, Incidentes, Integrações, Métricas,
// Auditoria, Configurações — não são desta sprint, spec §7 "não construir").

const NAV_ITEMS = [
  { to: '/admin/estabelecimentos', label: 'Estabelecimentos', icon: Store },
  { to: '/admin/usuarios', label: 'Usuários', icon: UsersIcon },
  { to: '/admin/planos', label: 'Planos', icon: CreditCard },
]

export function AdminLayout() {
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="flex w-52 flex-col gap-6 bg-sidebar px-3 py-4 text-white">
        <div className="px-2">
          <FilaZeroLogo variant="light" size={24} wordmarkSize="sm" />
          <p className="mt-1 px-0 text-[11px] uppercase tracking-wide text-white/50">Plataforma</p>
        </div>
        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-2 py-2 text-sm ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
