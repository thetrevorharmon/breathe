import type { ReactNode } from 'react'

/** Centred phone-width column, full height. Designed at 390px, works from 360px. */
export function PhoneColumn({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">{children}</main>
}
