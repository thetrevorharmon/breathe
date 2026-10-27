import { stepValue } from '../lib/step'
import { StepButton } from './StepButton'

type Props = {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  /** Value the dial started at; when it differs from `value`, shows a breath border and "was N". */
  changedFrom?: number
}

export function DialTile({ label, value, onChange, min, max, changedFrom }: Props) {
  const changed = changedFrom !== undefined && changedFrom !== value
  return (
    <div
      className={`flex min-w-0 flex-col gap-1.5 rounded-tile border bg-surface px-3.5 pb-3 pt-3.5 ${
        changed ? 'border-breath' : 'border-border'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[13px] font-bold text-muted">{label}</div>
        <div
          className={`text-[12px] font-extrabold text-breath ${changed ? '' : 'invisible'}`}
          aria-hidden={!changed}
        >
          was {changedFrom}
        </div>
      </div>
      <output
        className="text-[44px] font-extrabold leading-none"
        aria-live="polite"
        aria-label={`${label} ${value}`}
      >
        {value}
      </output>
      <div className="mt-1 flex gap-2">
        <StepButton
          shape="wide"
          label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(stepValue(value, -1, min, max, 1))}
        >
          −
        </StepButton>
        <StepButton
          shape="wide"
          label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(stepValue(value, 1, min, max, 1))}
        >
          +
        </StepButton>
      </div>
    </div>
  )
}
