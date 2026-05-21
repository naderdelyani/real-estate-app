'use client';

import { useLocale } from 'next-intl';
import { Toaster } from 'react-hot-toast';

export function ToasterProvider() {
  const locale = useLocale();
  const isRTL = locale === 'fa';

  return (
    <Toaster
      position={isRTL ? 'top-left' : 'top-right'}
      toastOptions={{
        duration: 4000,
        style: { background: '#363636', color: '#fff' },
        success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }}
    />
  );
}
