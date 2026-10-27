import type { Frame } from '../../session/frame'
import { InnerRing } from './InnerRing'
import { OuterRing } from './OuterRing'

/** The 330×330 ring visual: outer progress ring, inner breath ring, centre text. */
export function SessionRing({ frame }: { frame: Frame }) {
  return (
    <div className="relative size-[330px]">
      <OuterRing frame={frame} />
      <InnerRing frame={frame} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center">
        {frame.kind === 'breathe' && (
          <div
            className="pl-[0.16em] text-[30px] font-extrabold tracking-[0.16em]"
            style={{ opacity: frame.labelOpacity }}
          >
            {frame.label}
          </div>
        )}
        {(frame.kind === 'lead' || frame.kind === 'rest') && (
          <>
            <div className="text-[13px] font-bold tracking-[0.18em] text-rest-text">
              {frame.countTitle}
            </div>
            <div className="text-[56px] font-bold leading-none">{frame.countNum}</div>
          </>
        )}
        {frame.done && (
          <>
            <div className="text-[34px] font-extrabold">Done</div>
            <div className="text-[14px] text-muted">{frame.doneSub}</div>
          </>
        )}
      </div>
    </div>
  )
}
