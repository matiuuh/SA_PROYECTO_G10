import { Link, useMatch } from 'react-router-dom'

interface NavLinkProps {
  to: string
  children: React.ReactNode
  isAnchor?: boolean
}

export function NavLink({ to, children, isAnchor }: NavLinkProps) {
  const active = useMatch(to)
  const baseClasses = `text-sm font-medium transition-colors duration-200 hover:text-[var(--color-denim-300)] ${
    active ? 'text-white' : 'text-[var(--color-denim-200)]'
  }`

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (to.startsWith('#')) {
      e.preventDefault()
      const targetId = to.replace('#', '')
      const element = document.getElementById(targetId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  if (isAnchor && to.startsWith('#')) {
    return (
      <a href={to} onClick={handleAnchorClick} className={baseClasses}>
        {children}
      </a>
    )
  }

  return (
    <Link to={to} className={baseClasses}>
      {children}
    </Link>
  )
}
