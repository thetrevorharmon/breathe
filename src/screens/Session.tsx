import { Placeholder } from './Placeholder'

export function SessionScreen({ onNext }: { onNext: () => void }) {
  return <Placeholder name="Session" nextLabel="Continue" onNext={onNext} />
}
