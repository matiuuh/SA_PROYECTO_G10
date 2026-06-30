import { ChevronLeft, ChevronRight, LayoutGrid, Play, Sparkles } from 'lucide-react'
import { IconButton } from '../atoms/IconButton'
import { ProgressPip } from '../atoms/ProgressPip'

type FootbarControlsProps = {
  currentIndex: number
  totalSlides: number
  onPrevious: () => void
  onNext: () => void
  onSelect: (index: number) => void
}

export function FootbarControls({
  currentIndex,
  totalSlides,
  onPrevious,
  onNext,
  onSelect,
}: FootbarControlsProps) {
  return (
    <div className="footbar-controls" aria-label="Controles de presentación">
      <IconButton
        label="Anterior"
        icon={ChevronLeft}
        isDisabled={currentIndex === 0}
        onClick={onPrevious}
      />
      <div className="slide-progress" aria-label={`Diapositiva ${currentIndex + 1} de ${totalSlides}`}>
        {Array.from({ length: totalSlides }, (_, index) => (
          <ProgressPip
            key={index}
            isActive={index === currentIndex}
            label={`Ir a diapositiva ${index + 1}`}
            onClick={() => onSelect(index)}
          />
        ))}
      </div>
      <IconButton
        label="Siguiente"
        icon={ChevronRight}
        isDisabled={currentIndex === totalSlides - 1}
        onClick={onNext}
      />
      <span className="footbar-separator" />
      <IconButton label="Vista de diapositivas" icon={LayoutGrid} />
      <IconButton label="Modo presentación" icon={Play} isActive />
      <IconButton label="Estética de lujo" icon={Sparkles} />
    </div>
  )
}
