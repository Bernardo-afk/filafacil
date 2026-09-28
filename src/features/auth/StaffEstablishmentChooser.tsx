import { useNavigate } from 'react-router-dom'
import { Store } from 'lucide-react'
import { listStaffAccess, pathForMembershipRole } from '../../mock/services/membership'
import { useSessionStore } from '../../mock/session'

// "Quem tem mais de um vínculo escolhe o estabelecimento" (spec história 06).
export function StaffEstablishmentChooser() {
  const navigate = useNavigate()
  const session = useSessionStore((s) => s.session)
  const setActiveEstablishment = useSessionStore((s) => s.setActiveEstablishment)
  const access = session ? listStaffAccess(session.userId) : []

  function choose(establishmentId: string, role: (typeof access)[number]['role']) {
    setActiveEstablishment(establishmentId)
    navigate(pathForMembershipRole(role))
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-background px-6 py-8">
      <h1 className="mb-6 font-display text-xl font-bold text-foreground">Qual estabelecimento?</h1>
      <div className="flex flex-col gap-2">
        {access.map((a) => (
          <button
            key={`${a.membershipId}-${a.establishmentId}`}
            type="button"
            onClick={() => choose(a.establishmentId, a.role)}
            className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-card px-4 py-3 text-left"
          >
            <Store size={20} className="text-muted-foreground" />
            <span className="font-body text-foreground">{a.establishmentName}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
