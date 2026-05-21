'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Home, Building2, Menu, X, LogIn, UserPlus } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Navbar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const NAV_LINKS = [
    { href: '/' as const,           label: t('home'),       icon: Home },
    { href: '/properties' as const, label: t('properties'), icon: Building2 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary-600">
          <Building2 className="h-6 w-6" />
          <span>RealEstate</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop Auth + Language Switcher */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              <LogIn className="h-4 w-4 me-1.5" />
              {t('signIn')}
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button size="sm">
              <UserPlus className="h-4 w-4 me-1.5" />
              {t('register')}
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label={t('toggleMenu')}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 space-y-1 animate-slide-up">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium',
                pathname === href ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <LanguageSwitcher />
            <Link href="/auth/login"    onClick={() => setMenuOpen(false)}><Button variant="outline" className="w-full">{t('signIn')}</Button></Link>
            <Link href="/auth/register" onClick={() => setMenuOpen(false)}><Button className="w-full">{t('register')}</Button></Link>
          </div>
        </div>
      )}
    </header>
  );
}
