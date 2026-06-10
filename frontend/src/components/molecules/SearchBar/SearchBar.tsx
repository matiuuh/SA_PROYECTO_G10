import { useState, useRef, useCallback } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Buscar películas, series...' }: SearchBarProps) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClear = useCallback(() => {
    onChange('')
    inputRef.current?.focus()
  }, [onChange])

  const isActive = focused || value.length > 0

  return (
    <div
      className={`relative flex items-center transition-all duration-300 ease-out ${
        isActive ? 'w-72 sm:w-96' : 'w-48 sm:w-64'
      }`}
    >
      <div
        className={`absolute inset-0 rounded-xl border transition-all duration-300 pointer-events-none ${
          isActive
            ? 'border-[var(--color-denim-600)]/70 bg-[#0d1220] shadow-lg shadow-[var(--color-denim-900)]/50'
            : 'border-white/[0.07] bg-[#0d1220]/80'
        }`}
      />

      <Search
        size={15}
        strokeWidth={2}
        className={`absolute left-3.5 transition-colors duration-300 shrink-0 ${
          isActive ? 'text-[var(--color-denim-400)]' : 'text-[var(--color-denim-600)]'
        }`}
      />

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="relative z-10 w-full h-9 pl-9 pr-8 bg-transparent text-sm text-white placeholder:text-[var(--color-denim-600)] focus:outline-none focus:placeholder:text-[var(--color-denim-500)] transition-colors duration-200"
      />

      {value.length > 0 && (
        <button
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
          className="absolute right-2.5 z-10 w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200"
        >
          <X size={11} className="text-white" />
        </button>
      )}
    </div>
  )
}
