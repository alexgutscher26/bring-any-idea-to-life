type Priority = 'high' | 'normal'

interface Task<T> {
  id: number
  run: () => Promise<T>
  resolve: (val: T) => void
  reject: (err: any) => void
  priority: Priority
}

let counter = 0
let running = false
const queue: Task<any>[] = []

function pickNext() {
  const hi = queue.findIndex(t => t.priority === 'high')
  if (hi !== -1) return queue.splice(hi, 1)[0]
  return queue.shift() || null
}

/**
 * Processes tasks from a queue asynchronously.
 *
 * The function checks if a task is already running; if not, it sets the running flag to true. It then enters a loop to process tasks from the queue, picking the next task and awaiting its execution. If the task has a normal priority, it introduces a delay before execution. In case of an error during task execution, it logs the error and rejects the task. After processing all tasks, it resets the running flag and recursively calls itself if there are remaining tasks in the queue.
 *
 * @returns {Promise<void>} A promise that resolves when all tasks have been processed.
 */
async function work() {
  if (running) return
  running = true
  try {
    while (queue.length) {
      const task = pickNext()
      if (!task) break
      try {
        const delay = task.priority === 'normal' ? 1500 : 0
        if (delay) await new Promise(r => setTimeout(r, delay))
        const res = await task.run()
        task.resolve(res)
      } catch (e) {
        console.error(`Queue task ${task.id} failed:`, e)
        task.reject(e)
      }
    }
  } finally {
    running = false
    if (queue.length) work()
  }
}

export function enqueue<T>(fn: () => Promise<T>, priority: Priority = 'normal') {
  return new Promise<T>((resolve, reject) => {
    const task: Task<T> = { id: ++counter, run: fn, resolve, reject, priority }
    queue.push(task)
    work()
  })
}