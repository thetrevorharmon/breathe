import type { ReactNode } from 'react'

type Props = {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  /** 'round' = 44px circle (Stepper), 'wide' = full-width 44px rounded-12 (DialTile). */
  shape: 'round' | 'wide'
}

/** Shared − / + button. Disabled buttons drop to 35% opacity. */
export function StepButton({ label, onClick, disabled, children, shape }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={[
        'h-11 border-0 bg-subtle text-text font-bold leading-none select-none',
        shape === 'round'
          ? 'w-11 rounded-full text-[20px]'
          : 'min-w-0 flex-1 rounded-control text-[22px]',
        disabled ? 'opacity-35' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
