import type { ReactNode } from 'react'
import { PresentationFootbar } from '../organisms/PresentationFootbar'

type SlidesStageProps = {
  children: ReactNode
  currentIndex: number
  totalSlides: number
  onPrevious: () => void
  onNext: () => void
  onSelect: (index: number) => void
}

export function SlidesStage({
  children,
  currentIndex,
  totalSlides,
  onPrevious,
  onNext,
  onSelect,
}: SlidesStageProps) {
  return (
    <main className="slides-stage">
      <div className="stage-backdrop" />
      <div className="stage-shell">{children}</div>
      <PresentationFootbar
        currentIndex={currentIndex}
        totalSlides={totalSlides}
        onPrevious={onPrevious}
        onNext={onNext}
        onSelect={onSelect}
      />
    </main>
  )
}
