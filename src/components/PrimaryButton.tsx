import type { ButtonHTMLAttributes } from 'react'

/** 60px pill in the breath colour. Disabled = 35% opacity. */
export function PrimaryButton({
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`h-[60px] w-full rounded-full border-0 bg-breath text-[18px] font-extrabold text-on-breath disabled:opacity-35 ${className}`}
      {...rest}
    />
  )
}
