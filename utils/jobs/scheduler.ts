import cron from 'node-cron'

import logger from '@/utils/logger'
import { projectItemSyncJob } from './project-item-sync'
import { Job } from './types'

//* background jobs, started once per server process from instrumentation.ts
//! single pm2 instance only — in cluster mode every worker would fire the same job

//* adding a sync is one line here
const JOBS: Job[] = [projectItemSyncJob]

//* survives the dev server re-running this module on hot reload
const globalForJobs = global as unknown as { jobsStarted?: boolean; running?: Set<string> }

function runningJobs() {
  return (globalForJobs.running ||= new Set<string>())
}

//* jobs only run when the env var asks for them, see instrumentation.ts
export function areJobsEnabled() {
  return process.env.ENABLE_SYNC_CRON === 'true'
}

//* the cron expression of a registered job, for showing the schedule in the ui
//! null when the job never runs, so the ui cannot promise a sync that is switched off or scheduled with a bad expression
export function getJobSchedule(code: string) {
  if (!areJobsEnabled()) return null

  const schedule = JOBS.find((job) => job.code === code)?.schedule ?? null

  if (!schedule || !cron.validate(schedule)) return null

  return schedule
}

export function isJobRunning(code: string) {
  return runningJobs().has(code)
}

//* one run at a time per job, whoever asks second is told to wait
export async function runJobExclusive(code: string, run: () => Promise<void>) {
  const running = runningJobs()

  if (running.has(code)) return false

  running.add(code)

  try {
    await run()
  } finally {
    running.delete(code)
  }

  return true
}

export function startJobs() {
  if (globalForJobs.jobsStarted) return

  globalForJobs.jobsStarted = true

  for (const job of JOBS) {
    if (!cron.validate(job.schedule)) {
      logger.error({ job: job.code, schedule: job.schedule }, 'Job not scheduled, the schedule is invalid')
      continue
    }

    cron.schedule(job.schedule, async () => {
      //! nothing is awaiting this callback, so anything thrown here becomes an unhandled rejection and kills the server
      try {
        //* shows the schedule reached this job, it can still be skipped below
        logger.info({ job: job.code, at: new Date().toISOString() }, 'Job started')

        const startedAt = Date.now()
        const started = await runJobExclusive(job.code, job.run)

        //* a run longer than the interval is normal on a big first sync, the next one just steps aside
        if (!started) {
          logger.warn({ job: job.code }, 'Job skipped, the previous run is still going')
          return
        }

        logger.info({ job: job.code, durationMs: Date.now() - startedAt }, 'Job done')
      } catch (error) {
        logger.error({ job: job.code, error }, 'Job failed')
      }
    })

    logger.info({ job: job.code, schedule: job.schedule }, 'Job scheduled')
  }
}