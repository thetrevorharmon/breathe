import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> & {
  'aria-label': string
  children: ReactNode
}

/** At least 44×44px hit target, transparent background. */
export function IconButton({ className = '', type = 'button', children, ...rest }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full border-0 bg-transparent text-text disabled:opacity-35 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
