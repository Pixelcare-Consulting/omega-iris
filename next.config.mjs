/** @type {import('next').NextConfig} */

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pino', 'pino-pretty'],
    serverActions: {
      bodySizeLimit: '50MB',
    },
  },
}

export default nextConfig
