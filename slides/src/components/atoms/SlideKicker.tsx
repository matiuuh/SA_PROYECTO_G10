type SlideKickerProps = {
  children: string
}

export function SlideKicker({ children }: SlideKickerProps) {
  return <p className="slide-kicker">{children}</p>
}
