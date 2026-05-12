import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Pino needs Node.js native require (avoids bundler issues in serverless)
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'pino', 'pino-pretty'],
  // Transpile internal monorepo packages
  transpilePackages: [
    '@nutricoach/database',
    '@nutricoach/queue',
    '@nutricoach/types',
    '@nutricoach/config',
    '@nutricoach/validators',
    '@nutricoach/events',
    '@nutricoach/nutrition-engine',
    '@nutricoach/training-engine',
    '@nutricoach/recovery-engine',
    '@nutricoach/ai',
    '@nutricoach/utils',
    '@nutricoach/ui',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.trainingpeaks.com',
      },
      {
        protocol: 'https',
        hostname: '**.garmin.com',
      },
    ],
  },
  // Security + observability headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
          // Build identifier — visible in response headers for deploy verification
          { key: 'X-App-Version', value: process.env.npm_package_version ?? '0.1.0' },
        ],
      },
    ]
  },
}

// NOTE: withSentryConfig (source maps + release creation) is enabled only in CI
// when SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT are all set.
// The Sentry SDK still initializes at runtime via instrumentation.ts.
// To enable: add these 3 vars to Vercel environment variables.

export default nextConfig

