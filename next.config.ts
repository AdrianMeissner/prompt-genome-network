import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Stripe Webhook braucht raw body
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default nextConfig
