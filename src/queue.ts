import { createDebugger } from './utils'

type Job = {
  id: string
  handler: () => Promise<void>
  retries?: number
}

const debug = createDebugger('queue')

export class JobQueue {
  private readonly MAX_RETRIES = 5
  private readonly _queue: Job[] = []

  enqueue(job: Job) {
    if (this._queue.some((q) => q.id === job.id)) {
      debug(`[id: ${job.id}] Job already enqueued`)
      return
    }

    debug(`[id: ${job.id}] New job enqueued`)
    this._queue.push(job)
  }

  async process() {
    const job = this._queue.shift()

    if (!job || job.retries >= this.MAX_RETRIES) {
      return
    }

    try {
      debug(`[id: ${job.id}] Processing job`)
      await job.handler()
      debug(`[id: ${job.id}] Job processed`)
    } catch (error) {
      console.error('Error processing job: ', error)
      this.enqueue({ ...job, retries: (job.retries ?? 0) + 1 })
    }
  }

  setupProcessor(interval: number) {
    setTimeout(() => {
      this.process().then(() => this.setupProcessor(interval))
    }, interval)
  }
}

const queue = new JobQueue()

export default queue
