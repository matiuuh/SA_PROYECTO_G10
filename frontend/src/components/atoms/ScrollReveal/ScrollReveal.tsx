import { useScrollReveal } from '../../../hooks/useScrollReveal'

type RevealVariant = 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'fade'

interface ScrollRevealProps {
  children: React.ReactNode
  variant?: RevealVariant
  delay?: number
  className?: string
  threshold?: number
}

const baseHidden: Record<RevealVariant, string> = {
  'fade-up':    'opacity-0 translate-y-10',
  'fade-down':  'opacity-0 -translate-y-10',
  'fade-left':  'opacity-0 translate-x-10',
  'fade-right': 'opacity-0 -translate-x-10',
  'fade':       'opacity-0',
}

export function ScrollReveal({
  children,
  variant = 'fade-up',
  delay = 0,
  className = '',
  threshold,
}: ScrollRevealProps) {
  const { ref, visible } = useScrollReveal({ threshold })

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-x-0 translate-y-0' : baseHidden[variant]
      } ${className}`}
    >
      {children}
    </div>
  )
}
