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