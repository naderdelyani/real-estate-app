import createMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  const pathLocale = request.nextUrl.pathname.split('/')[1];
  const locale = (routing.locales as readonly string[]).includes(pathLocale)
    ? pathLocale
    : routing.defaultLocale;
  response.headers.set('x-locale', locale);

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
