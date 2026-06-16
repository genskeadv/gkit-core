type BrandLogoProps = {
  className?: string
  label?: string
}

/**
 * Marca oficial GKIT usada no painel, menus, login e módulos.
 */
export function BrandLogo({ className = '', label = 'GKIT' }: BrandLogoProps) {
  return (
    <span className={`brand-logo inline-flex shrink-0 items-center justify-center ${className}`} aria-label={label}>
      <img src="/GKIT_Genske.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
    </span>
  )
}
