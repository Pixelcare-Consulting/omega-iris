/** @type {import('next').NextConfig} */

const nextConfig = {
  allowedDevOrigins: ['172.16.5.126', 'localhost:3000', '172.16.5.2:50000'],
  experimental: {
    serverComponentsExternalPackages: ['pino', 'pino-pretty'],
    serverActions: {
      bodySizeLimit: '50MB',
    },
  },
}

export default nextConfig
