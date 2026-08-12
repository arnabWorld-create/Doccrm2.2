/** @type {import('next').NextConfig} */

// FIX #4: Content-Security-Policy applied to all page responses via headers config.
// The same policy is also applied to API responses via withSecurityHeaders()
// in lib/middleware.ts. Both must stay in sync.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

const cspHeader = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  // Allow Supabase images + WhatsApp/Instagram/Google link-preview crawlers
  `img-src 'self' data: blob: ${supabaseUrl} https://web.whatsapp.com https://static.whatsapp.net https://*.cdninstagram.com https://lookaside.fbsbx.com`,
  `connect-src 'self' ${supabaseUrl} https://*.upstash.io ${appUrl}`.trim(),
  `font-src 'self' https://fonts.gstatic.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
  // Allow Google Maps embed + YouTube embed
  `frame-src https://www.google.com https://www.youtube.com`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
].join('; ');

const nextConfig = {
  // Exclude the old landing folder from compilation
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/landing/**'],
    };
    return config;
  },

  // Security headers for all page responses
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
        ],
      },
    ];
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
