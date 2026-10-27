import { Placeholder } from './Placeholder'

export function SetupScreen({ onNext }: { onNext: () => void }) {
  return <Placeholder name="Setup" nextLabel="Start" onNext={onNext} />
}
