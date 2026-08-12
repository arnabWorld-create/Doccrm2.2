import { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://faithclinic.in';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Block internal app routes from being indexed
        disallow: [
          '/patients/',
          '/appointments/',
          '/analytics/',
          '/calendar/',
          '/payments/',
          '/settings/',
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
