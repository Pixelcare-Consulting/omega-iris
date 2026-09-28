//* a background job the scheduler can register, one per sync
export type Job = {
  code: string //* names the lock and labels the logs
  description: string
  schedule: string
  run: () => Promise<void>
}