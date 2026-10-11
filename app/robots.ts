import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mailk.arkai.dev';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/landing',
          '/faq',
          '/guida',
          '/login',
          '/downloads/',
          '/icon.png',
          '/favicon.ico',
          '/google553873ac7a4cf4f1.html',
          '/BingSiteAuth.xml',
          '/01be68e154644f7fa501e9d99ec924a0.txt',
          '/91c39ba1a4cd4472be1973df35f46759.txt',
        ],
        disallow: [
          '/api/',
          '/campaigns/',
          '/newsletters/',
          '/lead-research/',
          '/settings/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
