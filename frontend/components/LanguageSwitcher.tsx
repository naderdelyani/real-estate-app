'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale() {
    const nextLocale = locale === 'en' ? 'fa' : 'en';
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <button
      onClick={switchLocale}
      className="px-3 py-1.5 text-sm font-medium rounded-xl border border-gray-300 hover:bg-gray-100 transition-colors"
      title={locale === 'en' ? 'Switch to Persian' : 'Switch to English'}
    >
      {locale === 'en' ? 'فارسی' : 'English'}
    </button>
  );
}
