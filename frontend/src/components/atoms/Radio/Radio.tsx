import type { InputHTMLAttributes } from 'react'

interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  description?: string
}

export function Radio({ label, description, ...props }: RadioProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="radio"
        className="mt-1 w-4 h-4 text-[var(--color-primary)] bg-[#0d1220] border-white/[0.15] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-0 cursor-pointer"
        {...props}
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-white group-hover:text-[var(--color-denim-200)] transition-colors">
          {label}
        </div>
        {description && (
          <div className="text-xs text-[var(--color-denim-400)] mt-0.5">
            {description}
          </div>
        )}
      </div>
    </label>
  )
}
