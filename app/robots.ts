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
