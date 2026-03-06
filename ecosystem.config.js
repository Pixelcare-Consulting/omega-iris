module.exports = {
  apps: [
    {
      name: 'omega-iris',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 80',
      max_memory_restart: '16G',
      env: {
        NODE_ENV: 'production',
        NEXTAUTH_URL: 'https://irisglobal.omegagti.com',
      },
    },
  ],
}
