module.exports = {
  apps: [
    {
      name: "omega-iris",
      script: "node_modules/next/dist/bin/next",
      max_memory_restart: "16G",
      env: {
        PORT: 3000,
      },
    },
  ],
}
