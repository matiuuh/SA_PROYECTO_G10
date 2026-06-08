import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  className = '',
}: SelectProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="
          w-full px-4 py-2.5 pr-10
          bg-white/5 border border-white/10 rounded-lg
          text-white text-sm
          appearance-none cursor-pointer
          transition-all duration-200
          hover:bg-white/[0.07] hover:border-white/20
          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#0f1419] text-white">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-denim-400)] pointer-events-none" />
    </div>
  )
}
