//* next calls this once per server process on boot
export async function register() {
  //* the edge runtime has no timers or prisma, jobs only belong in the node process
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  //* off unless asked for, so a local dev server does not hit sap every 30 minutes
  if (process.env.ENABLE_SYNC_CRON !== 'true') {
    console.info('Background jobs are off, set ENABLE_SYNC_CRON=true to start them')
    return
  }

  //! import here, not at the top — a top level import pulls prisma and node-cron into the edge bundle too
  //! a throw here fails the server boot, the jobs are never worth that
  try {
    const { startJobs } = await import('@/utils/jobs/scheduler')
    startJobs()
  } catch (error) {
    console.error('Could not start the background jobs:', error)
  }
}