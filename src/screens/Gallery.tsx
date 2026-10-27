import { useState } from 'react'
import { DialTile } from '../components/DialTile'
import { IconButton } from '../components/IconButton'
import { PrimaryButton } from '../components/PrimaryButton'
import { Stepper } from '../components/Stepper'
import { formatSeconds, formatTime } from '../lib/format'
import { ChevronLeft, Settings } from 'lucide-react'

/** Dev-only scratch page: ?screen=gallery. Not reachable from the normal flow. */
export function Gallery() {
  const [dialIn, setDialIn] = useState(5)
  const [dialOut, setDialOut] = useState(3)
  const [sets, setSets] = useState(3)
  const [inhale, setInhale] = useState(2.5)
  const [rest, setRest] = useState(15)
  return (
    <section className="flex flex-1 flex-col gap-4 px-6 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <IconButton aria-label="Back">
          <ChevronLeft />
        </IconButton>
        <div className="text-[17px] font-extrabold">Component gallery</div>
        <IconButton aria-label="Settings">
          <Settings size={20} />
        </IconButton>
      </div>
      <div className="text-[12px] font-extrabold tracking-[0.14em] text-breath">SET YOUR DIALS</div>
      <div className="grid grid-cols-2 gap-3">
        <DialTile
          label="Inhale dial"
          value={dialIn}
          min={1}
          max={6}
          changedFrom={4}
          onChange={setDialIn}
        />
        <DialTile
          label="Exhale dial"
          value={dialOut}
          min={1}
          max={5}
          changedFrom={3}
          onChange={setDialOut}
        />
      </div>
      <div className="text-[12px] font-extrabold tracking-[0.14em] text-muted">WORKOUT</div>
      <div className="flex flex-col divide-y divide-border">
        <Stepper className="py-2" label="Sets" value={sets} min={1} max={6} onChange={setSets} />
        <Stepper
          className="py-2"
          label="Inhale"
          hint="Breathe in hard"
          value={inhale}
          min={0.5}
          max={10}
          step={0.5}
          format={formatSeconds}
          onChange={setInhale}
        />
        <Stepper
          className="py-2"
          label="Rest between sets"
          hint="At the minimum"
          value={rest}
          min={15}
          max={180}
          step={15}
          format={formatSeconds}
          onChange={setRest}
        />
        <Stepper
          className="py-2"
          label="Hold"
          variant="compact"
          value={0}
          min={0}
          max={10}
          step={0.5}
          format={formatSeconds}
          onChange={() => {}}
        />
      </div>
      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-3">
        <div className="flex justify-between text-[14px] text-muted">
          <span>Total time</span>
          <span className="font-bold text-text">{formatTime(333)}</span>
        </div>
        <PrimaryButton>Start</PrimaryButton>
        <PrimaryButton disabled>Save (disabled)</PrimaryButton>
      </div>
    </section>
  )
}
