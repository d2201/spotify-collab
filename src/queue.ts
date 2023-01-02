import { createDebugger } from './utils'

type Job = {
  id: string
  handler: () => Promise<void>
}

const debug = createDebugger('queue')

export class JobQueue {
  private readonly _queue: Job[] = []

  enqueue(job: Job) {
    if (this._queue.some((q) => q.id === job.id)) {
      debug('Job already enqueued')
      return
    }

    debug('New job enqueued')
    this._queue.push(job)
  }

  async process() {
    const job = this._queue.shift()

    if (!job) {
      return
    }

    try {
      debug('Processing job')
      await job.handler()
      debug('Job processed')
    } catch (error) {
      console.error('Error processing job: ', error)
      debug('Enqueuing job again')
      this.enqueue(job)
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
