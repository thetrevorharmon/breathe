import type { Frame } from '../../session/frame'

const SIZE = 330
const C = SIZE / 2
const R = 160
const L = 2 * Math.PI * R
const TICK_R = 150

/** Whole-session progress: one arc per set with 10° gaps, rep ticks and the moving indicator. */
export function OuterRing({ frame }: { frame: Frame }) {
  const rad = (frame.indicatorDeg * Math.PI) / 180
  const dotX = C + R * Math.sin(rad) - 8
  const dotY = C - R * Math.cos(rad) - 8
  return (
    <>
      <svg width={SIZE} height={SIZE} aria-hidden="true" className="absolute left-0 top-0">
        <g transform={`rotate(-90 ${C} ${C})`} fill="none" strokeWidth={4} strokeLinecap="round">
          {frame.arcs.map((a, i) => (
            <g key={i}>
              <circle
                cx={C}
                cy={C}
                r={R}
                className="stroke-track-outer"
                strokeDasharray={`${((a.len / 360) * L).toFixed(2)} ${L.toFixed(2)}`}
                strokeDashoffset={((-a.start / 360) * L).toFixed(2)}
              />
              <circle
                cx={C}
                cy={C}
                r={R}
                className="stroke-progress"
                strokeDasharray={`${((a.fill / 360) * L).toFixed(2)} ${L.toFixed(2)}`}
                strokeDashoffset={((-a.start / 360) * L).toFixed(2)}
                opacity={a.fill > 0.3 ? 1 : 0}
              />
            </g>
          ))}
        </g>
        {frame.ticks.map((tk, i) => (
          <rect
            key={i}
            x={C - 1}
            y={C - TICK_R - 4}
            width={2}
            height={8}
            rx={1}
            className={tk.on ? 'fill-tick-on' : 'fill-tick-off'}
            transform={`rotate(${tk.angle.toFixed(2)} ${C} ${C})`}
          />
        ))}
      </svg>
      <div
        aria-hidden="true"
        className="absolute size-4 rounded-full bg-progress shadow-glow"
        style={{ left: dotX.toFixed(1) + 'px', top: dotY.toFixed(1) + 'px' }}
      />
    </>
  )
}
