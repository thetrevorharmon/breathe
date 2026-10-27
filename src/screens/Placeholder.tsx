import type { ReactNode } from 'react'
import { PrimaryButton } from '../components/PrimaryButton'

/** Temporary body for screens that later tasks replace. */
export function Placeholder({
  name,
  nextLabel,
  onNext,
  children,
}: {
  name: string
  nextLabel: string
  onNext: () => void
  children?: ReactNode
}) {
  return (
    <section className="flex flex-1 flex-col gap-6 px-6 pb-8 pt-12">
      <div>
        <div className="text-[12px] font-extrabold tracking-[0.16em] text-breath">
          BREATH TRAINING
        </div>
        <h1 className="m-0 text-[28px] font-extrabold">{name}</h1>
        <p className="text-[14px] text-muted">Placeholder screen.</p>
      </div>
      {children}
      <PrimaryButton className="mt-auto" onClick={onNext}>
        {nextLabel}
      </PrimaryButton>
    </section>
  )
}
