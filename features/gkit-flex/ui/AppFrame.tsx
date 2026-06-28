'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const navItems = [
  { href: '/modulos/gkit-flex', label: 'Cockpit' },
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

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="gkit-flex-shell">
      <aside className="gkit-flex-sidebar">
        <Link className="gkit-flex-sidebar-header" href="/modulos/gkit-flex">
          <div className="gkit-flex-sidebar-mark" aria-hidden="true">G</div>
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

        <div className="gkit-flex-sidebar-footer">
          <span>Operacao Flex</span>
          <span className="sidebar-badge">Integrado ao Core</span>
        </div>
      </aside>

      <section className="gkit-flex-main">
        <div className="gkit-flex-bg" />
        {children}
      </section>
    </div>
  );
}
