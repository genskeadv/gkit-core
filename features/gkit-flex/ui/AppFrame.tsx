'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { BrandLogo } from '@/features/shared/brand-logo';
import type { PlatformUsuario } from '@/lib/auth/platform';

const FLEX_COMPETENCIA_STORAGE_KEY = 'gkit-flex:competencia';
const FLEX_COMPETENCIA_EVENT = 'gkit-flex:competencia-change';

const navItems = [
  { href: '/modulos/gkit-flex', label: 'Cockpit' },
  { href: '/modulos/gkit-flex/previsoes', label: 'Previsoes' },
  { href: '/modulos/gkit-flex/receitas', label: 'Receitas' },
  { href: '/modulos/gkit-flex/pagamentos', label: 'Pagamentos' },
  { href: '/modulos/gkit-flex/saneamento', label: 'Saneamento' },
  { href: '/modulos/gkit-flex/colaboradores', label: 'Colaboradores' },
  { href: '/modulos/gkit-flex/comissoes', label: 'Comiss\u00f5es' },
  { href: '/modulos/gkit-flex/cadastros', label: 'Cadastros' },
  { href: '/modulos/gkit-flex/auditoria', label: 'Auditoria' },
];

function isActive(pathname: string, href: string) {
  if (href === '/modulos/gkit-flex') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function normalizeCompetencia(value: string | null | undefined) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}/.test(text) ? text.slice(0, 7) : '';
}

function withCompetencia(href: string, competencia: string) {
  return competencia ? `${href}?competencia=${encodeURIComponent(competencia)}` : href;
}

export function AppFrame({ children, usuario }: { children: ReactNode; usuario: PlatformUsuario }) {
  const pathname = usePathname();
  const [competencia, setCompetencia] = useState('');

  useEffect(() => {
    const readCompetencia = () => {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = normalizeCompetencia(params.get('competencia'));
      const fromStorage = normalizeCompetencia(window.localStorage.getItem(FLEX_COMPETENCIA_STORAGE_KEY));
      setCompetencia(fromUrl || fromStorage);
    };

    readCompetencia();
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ competencia?: string }>).detail;
      setCompetencia(normalizeCompetencia(detail?.competencia));
    };
    window.addEventListener(FLEX_COMPETENCIA_EVENT, onChange);
    return () => window.removeEventListener(FLEX_COMPETENCIA_EVENT, onChange);
  }, []);

  return (
    <main className="module-shell gkit-flex-shell gkit-flex-operational-shell">
      <aside className="module-sidebar gkit-flex-sidebar">
        <Link className="module-sidebar-header gkit-flex-sidebar-header" href={withCompetencia('/modulos/gkit-flex', competencia)}>
          <BrandLogo className="module-sidebar-mark gkit-flex-sidebar-mark" label="Gestao mensal" />
          <div>
            <strong>GKIT Flex</strong>
            <small>Gestao mensal</small>
          </div>
        </Link>

        <nav aria-label="Navegacao GKIT Flex">
          {navItems.map((item) => (
            <Link className={isActive(pathname, item.href) ? 'active' : ''} href={withCompetencia(item.href, competencia)} key={item.href}>
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
