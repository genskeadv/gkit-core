import Image from 'next/image'

type BrandLogoProps = {
  className?: string
  label?: string
}

export function BrandLogo({ className = '', label = 'GKLI' }: BrandLogoProps) {
  return (
    <span className={`brand-logo ${className}`.trim()} aria-label={label} role="img">
      <Image alt="" aria-hidden="true" fill sizes="76px" src="/GKLI_Genske.png" />
    </span>
  )
}
