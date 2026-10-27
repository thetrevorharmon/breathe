import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DialTile } from './DialTile'
import { Stepper } from './Stepper'

describe('Stepper', () => {
  it('steps by step and disables at bounds', async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <Stepper label="Inhale" value={2.5} min={0.5} max={3} step={0.5} onChange={onChange} />,
    )
    await userEvent.click(screen.getByLabelText('Increase Inhale'))
    expect(onChange).toHaveBeenLastCalledWith(3)
    rerender(<Stepper label="Inhale" value={3} min={0.5} max={3} step={0.5} onChange={onChange} />)
    expect(screen.getByLabelText('Increase Inhale')).toBeDisabled()
    expect(screen.getByLabelText('Decrease Inhale')).toBeEnabled()
  })
})

describe('DialTile', () => {
  it('shows "was N" only when changed', () => {
    const { rerender } = render(
      <DialTile
        label="Inhale dial"
        value={4}
        min={1}
        max={6}
        onChange={() => {}}
        changedFrom={4}
      />,
    )
    expect(screen.getByText('was 4')).toHaveClass('invisible')
    rerender(
      <DialTile
        label="Inhale dial"
        value={5}
        min={1}
        max={6}
        onChange={() => {}}
        changedFrom={4}
      />,
    )
    expect(screen.getByText('was 4')).not.toHaveClass('invisible')
  })
})
