import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Store, Users as UsersIcon, CreditCard, Menu, X } from 'lucide-react'
import { FilaZeroLogo } from '../components/brand/Logo'

// Admin · plataforma (spec §7, história 34): sidebar escura 208px no desktop.
// No celular ela vira uma gaveta (drawer) aberta por um botão de menu, em vez
// de disputar espaço fixo com o conteúdo (decisão de responsividade, sem
// equivalente na spec — o protótipo é desktop-only). Na Sprint 1 ative só
// Estabelecimentos, Usuários e Planos (os demais itens do protótipo —
// Organizações, Pagamentos, Suporte, Incidentes, Integrações, Métricas,
// Auditoria, Configurações — não são desta sprint, spec §7 "não construir").

const NAV_ITEMS = [
  { to: '/admin/estabelecimentos', label: 'Estabelecimentos', icon: Store },
  { to: '/admin/usuarios', label: 'Usuários', icon: UsersIcon },
  { to: '/admin/planos', label: 'Planos', icon: CreditCard },
]

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col gap-6 bg-sidebar px-3 py-4 text-white transition-transform duration-200 md:static md:w-52 md:translate-x-0 ${
          menuOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <div>
            <FilaZeroLogo variant="light" size={24} wordmarkSize="sm" />
            <p className="mt-1 px-0 text-[11px] uppercase tracking-wide text-white/50">Plataforma</p>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
            className="text-white/70 md:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
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
