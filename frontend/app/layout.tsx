import type { ReactNode } from 'react';
import { Inter, Vazirmatn } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const vazirmatn = Vazirmatn({ subsets: ['arabic'], variable: '--font-vazirmatn' });

export default function RootLayout({ children }: { children: ReactNode }) {
  const locale = headers().get('x-locale') ?? 'en';
  const isRTL = locale === 'fa';

  return (
    <html
      lang={locale}
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`${inter.variable} ${vazirmatn.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
