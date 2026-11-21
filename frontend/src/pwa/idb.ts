const DB = 'haven-ams'
const STORE = 'snapshots'
const VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbSet(key: string, value: unknown) {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ value, at: Date.now() }, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    /* IndexedDB unavailable */
  }
}

export async function idbGet<T>(key: string): Promise<{ value: T; at: number } | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve((req.result as { value: T; at: number } | undefined) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export function cacheDashboardSnapshot(scope: string | null, data: unknown) {
  return idbSet(`dashboard:${scope ?? 'all'}`, data)
}

export function readDashboardSnapshot(scope: string | null) {
  return idbGet(`dashboard:${scope ?? 'all'}`)
}

export function cacheApartments(data: unknown) {
  return idbSet('apartments', data)
}
