import { NavLink, Outlet } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import { FilaZeroMark } from '../components/brand/Logo'

// Atendente · tablet (spec §7): sidebar escura estreita (64px), só ícones,
// sem faturamento/fidelidade/planos/marketing.

export function AttendantLayout() {
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="flex w-16 flex-col items-center gap-6 bg-sidebar py-4 text-white">
        <FilaZeroMark size={28} className="text-primary" />
        <NavLink
          to="/atendente/cardapio"
          className={({ isActive }) => `rounded-md p-2 ${isActive ? 'bg-white/10 text-primary' : 'text-white/70'}`}
          title="Cardápio"
        >
          <UtensilsCrossed size={22} />
        </NavLink>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
