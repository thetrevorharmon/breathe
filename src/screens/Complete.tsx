import { Placeholder } from './Placeholder'

export function CompleteScreen({ onNext }: { onNext: () => void }) {
  return <Placeholder name="Complete" nextLabel="Save" onNext={onNext} />
}
