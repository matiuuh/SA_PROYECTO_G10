import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[var(--color-denim-200)]">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2.5 bg-[#0d1220] border ${
          error ? 'border-[var(--color-error)]' : 'border-white/[0.07]'
        } rounded-lg text-white placeholder:text-[var(--color-denim-500)] focus:outline-none focus:border-[var(--color-primary)] transition-colors ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-[var(--color-error)]">{error}</span>
      )}
    </div>
  )
}
