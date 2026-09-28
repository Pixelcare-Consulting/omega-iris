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
    instrumentationHook: true, //* runs instrumentation.ts on server boot, needed for the background jobs
    serverComponentsExternalPackages: ['pino', 'pino-pretty'],
    serverActions: {
      bodySizeLimit: '50MB',
      allowedOrigins: ['172.16.5.126', 'irisglobal.omegagti.com', '172.24.123.45', '47.250.166.69'],
    },
  },
  webpack: (config, { nextRuntime, webpack }) => {
    //! instrumentation.ts is compiled for the edge runtime too, and the scheduler reaches node only modules through node-cron and the sap client
    //* the NEXT_RUNTIME check keeps them from running there, but webpack still resolves the import, so drop it from that build
    if (nextRuntime === 'edge') {
      config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^@\/utils\/jobs\/scheduler$/ }))
    }

    return config
  },
}

export default nextConfig
