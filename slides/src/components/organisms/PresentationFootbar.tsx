import { FootbarControls } from '../molecules/FootbarControls'

type PresentationFootbarProps = {
  currentIndex: number
  totalSlides: number
  onPrevious: () => void
  onNext: () => void
  onSelect: (index: number) => void
}

export function PresentationFootbar(props: PresentationFootbarProps) {
  return (
    <footer className="presentation-footbar">
      <FootbarControls {...props} />
    </footer>
  )
}
