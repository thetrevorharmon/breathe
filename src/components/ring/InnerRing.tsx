import type { Frame } from '../../session/frame'

const SIZE = 250
const C = SIZE / 2
const R = 121
const L = 2 * Math.PI * R

/** Breath clock (clockwise sweep per cycle), or the rest-coloured countdown. */
export function InnerRing({ frame }: { frame: Frame }) {
  const { fraction, mode, scale } = frame.inner
  const counting = mode === 'count'
  const len = fraction * L
  return (
    <div
      aria-hidden="true"
      className="absolute left-10 top-10"
      style={{ width: SIZE, height: SIZE, transform: `scale(${scale.toFixed(4)})` }}
    >
      <svg width={SIZE} height={SIZE} className="absolute left-0 top-0">
        <g transform={`rotate(-90 ${C} ${C})`} fill="none" strokeWidth={8}>
          <circle
            cx={C}
            cy={C}
            r={R}
            className={counting ? 'stroke-rest-track' : 'stroke-breath-track'}
          />
          <circle
            cx={C}
            cy={C}
            r={R}
            strokeLinecap="round"
            className={counting ? 'stroke-rest' : 'stroke-breath'}
            strokeDasharray={`${len.toFixed(2)} ${L.toFixed(2)}`}
            opacity={len > 0.5 ? 1 : 0}
          />
        </g>
        {mode === 'breathe' &&
          frame.phaseDots.map((d, i) => {
            const rad = (d.angle * Math.PI) / 180
            return (
              <circle
                key={i}
                cx={(C + R * Math.sin(rad)).toFixed(1)}
                cy={(C - R * Math.cos(rad)).toFixed(1)}
                r={5}
                className={d.lit ? 'fill-text' : 'fill-phase-dot-off'}
              />
            )
          })}
      </svg>
    </div>
  )
}
