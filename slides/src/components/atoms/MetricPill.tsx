type MetricPillProps = {
  value: string
  label: string
}

export function MetricPill({ value, label }: MetricPillProps) {
  return (
    <div className="metric-pill">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
