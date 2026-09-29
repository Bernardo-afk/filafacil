import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  UtensilsCrossed,
  Tags,
  ClipboardList,
  LayoutGrid,
  Users as UsersIcon,
  Store,
  Clock,
  Map,
  Menu,
  X,
} from 'lucide-react'
import { FilaZeroLogo } from '../components/brand/Logo'

// Gestor · desktop (spec §7): sidebar escura 208px com grupos de itens,
// cabeçalho com título da tela e data. Só os itens da Sprint 1 (§7 shell do admin
// vale a mesma regra: "ative só os itens da sprint"). No celular a sidebar vira
// uma gaveta (drawer) em vez de disputar espaço fixo com o conteúdo (decisão de
// responsividade, sem equivalente na spec — o protótipo é desktop-only).

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
      { to: '/gestor/planta', label: 'Planta', icon: Map },
      { to: '/gestor/fila', label: 'Fila de espera', icon: UsersIcon },
    ],
  },
  {
    label: 'Estabelecimento',
    items: [
      { to: '/gestor/estabelecimento', label: 'Estabelecimento', icon: Store },
      { to: '/gestor/mesas', label: 'Mesas e locais', icon: LayoutGrid },
      { to: '/gestor/horarios', label: 'Horários', icon: Clock },
    ],
  },
]

export function ManagerLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col gap-6 overflow-y-auto bg-sidebar px-3 py-4 text-white transition-transform duration-200 md:static md:w-52 md:translate-x-0 ${
          menuOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <FilaZeroLogo variant="light" size={24} wordmarkSize="sm" />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
            className="text-white/70 md:hidden"
          >
            <X size={20} />
          </button>
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
                onClick={() => setMenuOpen(false)}
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

      {menuOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-foreground/40 md:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" className="text-foreground">
            <Menu size={22} />
          </button>
          <FilaZeroLogo size={20} wordmarkSize="sm" />
        </div>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
