import { Check, X } from 'lucide-react'
import { PASSWORD_RULES } from '../../lib/password'

// PasswordRequirements (spec §7): "requisitos de senha... se atualizam enquanto a pessoa digita" (história 01).
export function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="flex flex-col gap-1">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li
            key={rule.key}
            className={`flex items-center gap-1.5 text-sm ${met ? 'text-success' : 'text-muted-foreground'}`}
          >
            {met ? <Check size={14} /> : <X size={14} />}
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
