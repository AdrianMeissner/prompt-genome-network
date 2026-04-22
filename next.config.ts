import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Stripe Webhook braucht raw body
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
