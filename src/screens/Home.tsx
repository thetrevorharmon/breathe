import { Placeholder } from './Placeholder'

export function HomeScreen({ onNext }: { onNext: () => void }) {
  return <Placeholder name="Home" nextLabel="Start workout" onNext={onNext} />
}
