import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Prisma and bcryptjs must run in Node.js runtime, not Edge
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
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

export default nextConfig

