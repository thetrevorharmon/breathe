import { stepValue } from '../lib/step'
import { StepButton } from './StepButton'

type Props = {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  /** Accessible name, and the visible label in the `row` variant. */
  label: string
  /** Small text under the label (row variant only). */
  hint?: string
  /** Value text, default `String(value)`. e.g. `formatSeconds`. */
  format?: (value: number) => string
  /** 'row': label (+hint) on the left, controls on the right. 'compact': controls only. */
  variant?: 'row' | 'compact'
  className?: string
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  hint,
  format = String,
  variant = 'row',
  className = '',
}: Props) {
  const controls = (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <StepButton
        shape="round"
        label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(stepValue(value, -1, min, max, step))}
      >
        −
      </StepButton>
      <output className="min-w-[54px] text-center text-[17px] font-extrabold" aria-live="polite">
        {format(value)}
      </output>
      <StepButton
        shape="round"
        label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(stepValue(value, 1, min, max, step))}
      >
        +
      </StepButton>
    </div>
  )
  if (variant === 'compact') return <div className={className}>{controls}</div>
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <div className="text-[15px] font-bold">{label}</div>
        {hint && <div className="text-[12px] text-muted">{hint}</div>}
      </div>
      {controls}
    </div>
  )
}
