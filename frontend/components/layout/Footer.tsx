import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Building2, Github, Twitter, Linkedin } from 'lucide-react';

const SOCIAL_LINKS = [
  { href: 'https://github.com/naderdelyani/real-estate-app', label: 'GitHub',   Icon: Github },
  { href: '#', label: 'Twitter',  Icon: Twitter },
  { href: '#', label: 'LinkedIn', Icon: Linkedin },
];

export async function Footer() {
  const t = await getTranslations('footer');

  const FOOTER_LINKS = {
    [t('company')]: [
      { href: '/about',    label: t('about') },
      { href: '/blog',     label: t('blog') },
      { href: '/careers',  label: t('careers') },
    ],
    [t('product')]: [
      { href: '/properties', label: t('browseProperties') },
      { href: '/pricing',    label: t('pricing') },
      { href: '/api-docs',   label: t('apiDocs') },
    ],
    [t('support')]: [
      { href: '/faq',     label: t('faq') },
      { href: '/contact', label: t('contact') },
      { href: '/privacy', label: t('privacyPolicy') },
    ],
  };

  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl mb-3">
              <Building2 className="h-6 w-6 text-primary-400" />
              RealEstate
            </Link>
            <p className="text-sm leading-relaxed">{t('description')}</p>
            <div className="flex gap-3 mt-4">
              {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{section}</h4>
              <ul className="space-y-2">
                {links.map(({ href, label }) => (
                  <li key={label}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Link href={href as any} className="text-sm hover:text-white transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p>© {new Date().getFullYear()} Real Estate App. {t('allRightsReserved')}</p>
          <p>{t('builtWith')}</p>
        </div>
      </div>
    </footer>
  );
}
