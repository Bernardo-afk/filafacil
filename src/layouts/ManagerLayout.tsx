import { NavLink, Outlet } from 'react-router-dom'
import {
  UtensilsCrossed,
  Tags,
  ClipboardList,
  LayoutGrid,
  Users as UsersIcon,
  Store,
} from 'lucide-react'
import { FilaZeroLogo } from '../components/brand/Logo'

// Gestor · desktop (spec §7): sidebar escura 208px com grupos de itens,
// cabeçalho com título da tela e data. Só os itens da Sprint 1 (§7 shell do admin
// vale a mesma regra: "ative só os itens da sprint").

const NAV_GROUPS: Array<{ label: string; items: Array<{ to: string; label: string; icon: typeof Store }> }> = [
  {
    label: 'Cardápio',
    items: [
      { to: '/gestor/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
      { to: '/gestor/promocoes', label: 'Promoções', icon: Tags },
      { to: '/gestor/fichas-tecnicas', label: 'Fichas técnicas', icon: ClipboardList },
    ],
  },
  {
    label: 'Salão',
    items: [
      { to: '/gestor/mesas', label: 'Mesas e locais', icon: LayoutGrid },
      { to: '/gestor/fila', label: 'Fila de espera', icon: UsersIcon },
    ],
  },
  {
    label: 'Estabelecimento',
    items: [{ to: '/gestor/estabelecimento', label: 'Estabelecimento', icon: Store }],
  },
]

export function ManagerLayout() {
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="flex w-52 flex-col gap-6 bg-sidebar px-3 py-4 text-white">
        <div className="px-2">
          <FilaZeroLogo variant="light" size={24} wordmarkSize="sm" />
        </div>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-white/50">
              {group.label}
            </span>
            {group.items.map(({ to, label, icon: Icon }) => (
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
        ))}
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
