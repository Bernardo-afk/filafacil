import { useState } from 'react'
import { RotateCw } from 'lucide-react'

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

// Cabeçalho do shell do admin (spec história 34, AdminApp.tsx): título +
// data + "Atualizar". Reaproveitado pelas telas de Usuários e Planos.
export function AdminHeader({ title, onRefresh }: { title: string; onRefresh: () => void }) {
  const [today] = useState(() => new Date())
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{DATE_FORMAT.format(today)}</p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground"
      >
        <RotateCw size={16} />
        Atualizar
      </button>
    </header>
  )
}
