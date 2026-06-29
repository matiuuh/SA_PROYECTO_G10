import { useMemo, useState } from 'react'
import { DecisionSlide } from '../organisms/DecisionSlide'
import { LuxuryIntroSlide } from '../organisms/LuxuryIntroSlide'
import { ProblemSlide } from '../organisms/ProblemSlide'
import { SolutionSlide } from '../organisms/SolutionSlide'
import { SlidesStage } from '../templates/SlidesStage'

export function SlidesApp() {
  const slides = useMemo(
    () => [<LuxuryIntroSlide />, <ProblemSlide />, <DecisionSlide />, <SolutionSlide />],
    [],
  )
  const [currentIndex, setCurrentIndex] = useState(0)

  const goPrevious = () => setCurrentIndex((index) => Math.max(0, index - 1))
  const goNext = () => setCurrentIndex((index) => Math.min(slides.length - 1, index + 1))

  return (
    <SlidesStage
      currentIndex={currentIndex}
      totalSlides={slides.length}
      onPrevious={goPrevious}
      onNext={goNext}
      onSelect={setCurrentIndex}
    >
      <div className="slide-transition" key={currentIndex}>
        {slides[currentIndex]}
      </div>
    </SlidesStage>
  )
}
