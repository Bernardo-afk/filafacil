import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  error?: boolean
}

// OTPScreen (spec §7): 6 campos, um dígito cada, avança sozinho, aceita colar o código inteiro.
export function OtpInput({ value, onChange, length = 6, disabled, error }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = value.padEnd(length, ' ').slice(0, length).split('')

  function setDigit(index: number, digit: string) {
    const next = value.padEnd(length, ' ').slice(0, length).split('')
    next[index] = digit
    onChange(next.join('').trimEnd())
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    setDigit(index, digit || ' ')
    if (digit && index < length - 1) refs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index]?.trim() && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    e.preventDefault()
    onChange(pasted)
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="Código de verificação">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          value={digit.trim()}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Dígito ${index + 1}`}
          className={`h-14 w-11 rounded-[var(--radius-md)] border text-center font-display text-xl font-semibold text-foreground outline-none focus:border-primary disabled:opacity-50 ${
            error ? 'border-error' : 'border-border'
          }`}
        />
      ))}
    </div>
  )
}
