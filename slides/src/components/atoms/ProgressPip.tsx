type ProgressPipProps = {
  isActive?: boolean
  label?: string
  onClick?: () => void
}

export function ProgressPip({ isActive = false, label = 'Ir a diapositiva', onClick }: ProgressPipProps) {
  return (
    <button className="progress-pip" data-active={isActive} aria-label={label} onClick={onClick} />
  )
}
