'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BrandLogo } from '@/features/shared/brand-logo';
import type { PlatformUsuario } from '@/lib/auth/platform';

const navItems = [
  { href: '/modulos/gkit-flex', label: 'Cockpit' },
  { href: '/modulos/gkit-flex/previsoes', label: 'Previsoes' },
  { href: '/modulos/gkit-flex/receitas', label: 'Receitas' },
  { href: '/modulos/gkit-flex/pagamentos', label: 'Pagamentos' },
  { href: '/modulos/gkit-flex/colaboradores', label: 'Colaboradores' },
  { href: '/modulos/gkit-flex/comissoes', label: 'Comiss\u00f5es' },
  { href: '/modulos/gkit-flex/cadastros', label: 'Cadastros' },
  { href: '/modulos/gkit-flex/auditoria', label: 'Auditoria' },
];

function isActive(pathname: string, href: string) {
  if (href === '/modulos/gkit-flex') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppFrame({ children, usuario }: { children: ReactNode; usuario: PlatformUsuario }) {
  const pathname = usePathname();

  return (
    <main className="module-shell gkit-flex-shell gkit-flex-operational-shell">
      <aside className="module-sidebar gkit-flex-sidebar">
        <Link className="module-sidebar-header gkit-flex-sidebar-header" href="/modulos/gkit-flex">
          <BrandLogo className="module-sidebar-mark gkit-flex-sidebar-mark" label="Gestao mensal" />
          <div>
            <strong>GKIT Flex</strong>
            <small>Gestao mensal</small>
          </div>
        </Link>

        <nav aria-label="Navegacao GKIT Flex">
          {navItems.map((item) => (
            <Link className={isActive(pathname, item.href) ? 'active' : ''} href={item.href} key={item.href}>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="module-sidebar-footer gkit-flex-sidebar-footer">
          <span>{usuario.nome}</span>
          <span className="sidebar-badge">{usuario.tipo.replace('_', ' ')}</span>
        </div>
      </aside>

      <section className="module-main gkit-flex-main">
        <div className="platform-bg gkit-flex-bg" />
        <div className="module-page-content gkit-flex-module-content">
          {children}
        </div>
      </section>
    </main>
  );
}
