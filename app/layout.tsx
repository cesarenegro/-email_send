import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import OnboardingController from '@/components/OnboardingController';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mailk.arkai.dev';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'MAIL-K — Precision Outbound B2B & Dispatch Confidenziale',
    template: '%s | MAIL-K',
  },
  description:
    'Orchestrazione outbound B2B e newsletter ad alta precisione per brand e studi d’eccellenza. Zero spam, recapito garantito in casella principale.',
  keywords: [
    'outbound b2b',
    'precision dispatch',
    'email deliverability',
    'hostinger smtp relay',
    'staggered sending',
    'newsletter editoriale',
    'b2b lead intelligence',
    'arkitecna',
    'mail-k',
  ],
  authors: [{ name: 'ARKITECNA', url: 'https://arkai.dev' }],
  creator: 'ARKITECNA',
  publisher: 'ARKITECNA',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    alternateLocale: 'en_US',
    url: siteUrl,
    siteName: 'MAIL-K Precision Outbound',
    title: 'MAIL-K — Precision Outbound B2B & Dispatch Confidenziale',
    description:
      'Invia sequenze massive iper-personalizzate e newsletter esclusive proteggendo la reputazione del tuo dominio con throttling dinamico e allineamento RFC 5321.',
    images: [
      {
        url: '/icon.png',
        width: 1024,
        height: 1024,
        alt: 'MAIL-K Precision Outbound',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MAIL-K — Precision Outbound B2B',
    description:
      'Protocollo di dispatch outbound B2B ad alta precisione e newsletter per aziende d’eccellenza.',
    images: ['/icon.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google:
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
      'UfDvYGqTqwxgoCTr6og8gFZhvJ9kwW9XUD4h0gtNBeI',
    other: {
      'msvalidate.01':
        process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ||
        'FFA8F28CC8F933190405508FC822C30C',
    },
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
};

import { LanguageProvider } from '@/components/LanguageProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="h-full">
      <head>
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://arkai.dev/#organization',
                  name: 'ARKITECNA',
                  url: 'https://arkai.dev',
                  logo: `${siteUrl}/icon.png`,
                },
                {
                  '@type': 'WebApplication',
                  '@id': `${siteUrl}/#webapp`,
                  name: 'MAIL-K',
                  url: siteUrl,
                  applicationCategory: 'BusinessApplication',
                  operatingSystem: 'All',
                  description:
                    'Protocollo di orchestrazione outbound B2B ad alta precisione e newsletter confidenziali per aziende e brand d’eccellenza.',
                  publisher: {
                    '@id': 'https://arkai.dev/#organization',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-full bg-[#fbf9f6] text-[#1b1c1a] antialiased">
        <LanguageProvider>
          <OnboardingController />
          <AppShell>{children}</AppShell>
        </LanguageProvider>
      </body>
    </html>
  );
}
