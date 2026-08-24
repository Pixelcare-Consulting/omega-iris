/** @type {import('next').NextConfig} */

const nextConfig = {
  allowedDevOrigins: [
    '172.16.5.126',
    'localhost:3000',
    '172.16.5.2:50000',
    '172.24.123.45',
    '172.24.123.45:3000',
    '47.250.166.69',
    '47.250.166.69:3000',
  ],
  experimental: {
    serverComponentsExternalPackages: ['pino', 'pino-pretty'],
    serverActions: {
      bodySizeLimit: '50MB',
      allowedOrigins: ['172.16.5.126', 'irisglobal.omegagti.com', '172.24.123.45', '47.250.166.69'],
    },
  },
}

export default nextConfig
