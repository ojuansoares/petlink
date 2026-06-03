import AsyncStorage from '@react-native-async-storage/async-storage'

const QUEUE_KEY = 'petlink.walk.queue'

export type WalkQueueItem = {
  id: string
  payload: any
  retries: number
  createdAt: string
}

async function getQueue(): Promise<WalkQueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  return raw ? JSON.parse(raw) : []
}

async function setQueue(queue: WalkQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export const walkQueueRepository = {
  async enqueue(payload: any): Promise<void> {
    const queue = await getQueue()
    queue.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      payload,
      retries: 0,
      createdAt: new Date().toISOString(),
    })
    await setQueue(queue)
  },

  async processQueue(processor: (payload: any) => Promise<void>): Promise<void> {
    const queue = await getQueue()
    if (queue.length === 0) return

    const remaining: WalkQueueItem[] = []
    for (const item of queue) {
      try {
        await processor(item.payload)
      } catch {
        if (item.retries < 2) {
          remaining.push({ ...item, retries: item.retries + 1 })
        }
      }
    }
    await setQueue(remaining)
  },

  async getQueueLength(): Promise<number> {
    const queue = await getQueue()
    return queue.length
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY)
  },
}
