interface SectionHeadingProps {
  eyebrow?: string
  title: string
  subtitle?: string
  centered?: boolean
}

export function SectionHeading({ eyebrow, title, subtitle, centered = false }: SectionHeadingProps) {
  const align = centered ? 'text-center items-center' : 'text-left items-start'
  return (
    <div className={`flex flex-col gap-3 ${align}`}>
      {eyebrow && (
        <span className="text-sm font-semibold uppercase tracking-widest text-[var(--color-denim-400)]">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">{title}</h2>
      {subtitle && (
        <p className="text-[var(--color-denim-300)] text-lg max-w-2xl">{subtitle}</p>
      )}
    </div>
  )
}
