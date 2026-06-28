export interface OfflineDownload {
  accountId: string
  profileId: string
  contentId: string
  title: string
  type: string
  episodeId?: string
  episodeTitle?: string
  posterUrl?: string
  downloadedAt: string
}

type EncryptedDownload = {
  id: string
  accountId: string
  profileId: string
  iv: ArrayBuffer
  data: ArrayBuffer
}

const DATABASE_NAME = 'quetzal_offline_content'
const DATABASE_VERSION = 1
const DOWNLOADS_STORE = 'downloads'
const KEYS_STORE = 'keys'
const ENCRYPTION_KEY_ID = 'downloads-aes-gcm'
const LEGACY_STORAGE_KEY = 'quetzal_offline_downloads'

let databasePromise: Promise<IDBDatabase> | null = null
let encryptionKeyPromise: Promise<CryptoKey> | null = null

export async function saveDownload(payload: OfflineDownload): Promise<void> {
  const database = await openDatabase()
  const key = await getEncryptionKey(database)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encodedPayload = new TextEncoder().encode(JSON.stringify(payload))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedPayload)
  const record: EncryptedDownload = {
    id: buildStorageId(payload),
    accountId: payload.accountId,
    profileId: payload.profileId,
    iv: toArrayBuffer(iv),
    data: encrypted,
  }

  await runRequest(database.transaction(DOWNLOADS_STORE, 'readwrite').objectStore(DOWNLOADS_STORE).put(record))
}

export async function listDownloads(accountId: string, profileId: string): Promise<OfflineDownload[]> {
  const database = await openDatabase()
  const key = await getEncryptionKey(database)
  const records = await runRequest<EncryptedDownload[]>(
    database.transaction(DOWNLOADS_STORE, 'readonly').objectStore(DOWNLOADS_STORE).getAll(),
  )
  const matchingRecords = records.filter(
    (record) => record.accountId === accountId && record.profileId === profileId,
  )

  const results = await Promise.all(matchingRecords.map(async (record) => {
    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(record.iv) },
        key,
        record.data,
      )
      return JSON.parse(new TextDecoder().decode(decrypted)) as OfflineDownload
    } catch {
      await runRequest(
        database.transaction(DOWNLOADS_STORE, 'readwrite').objectStore(DOWNLOADS_STORE).delete(record.id),
      )
      return null
    }
  }))

  return results
    .filter((download): download is OfflineDownload => download !== null)
    .sort((left, right) => right.downloadedAt.localeCompare(left.downloadedAt))
}

export async function hasDownload(
  accountId: string,
  profileId: string,
  contentId: string,
  episodeId?: string,
): Promise<boolean> {
  const database = await openDatabase()
  const key = buildStorageId({ accountId, profileId, contentId, episodeId })
  const record = await runRequest<EncryptedDownload | undefined>(
    database.transaction(DOWNLOADS_STORE, 'readonly').objectStore(DOWNLOADS_STORE).get(key),
  )
  return Boolean(record)
}

export async function removeDownload(
  accountId: string,
  profileId: string,
  contentId: string,
  episodeId?: string,
): Promise<void> {
  const database = await openDatabase()
  const key = buildStorageId({ accountId, profileId, contentId, episodeId })
  await runRequest(database.transaction(DOWNLOADS_STORE, 'readwrite').objectStore(DOWNLOADS_STORE).delete(key))
}

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in globalThis)) {
    return Promise.reject(new Error('IndexedDB no esta disponible en este navegador.'))
  }
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(DOWNLOADS_STORE)) {
        const downloads = database.createObjectStore(DOWNLOADS_STORE, { keyPath: 'id' })
        downloads.createIndex('accountProfile', ['accountId', 'profileId'], { unique: false })
      }
      if (!database.objectStoreNames.contains(KEYS_STORE)) {
        database.createObjectStore(KEYS_STORE)
      }
    }
    request.onsuccess = () => {
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      } catch {
        // Storage can be disabled while IndexedDB remains available.
      }
      resolve(request.result)
    }
    request.onerror = () => {
      databasePromise = null
      reject(request.error ?? new Error('No se pudo abrir el almacenamiento local.'))
    }
  })

  return databasePromise
}

async function getEncryptionKey(database: IDBDatabase): Promise<CryptoKey> {
  if (encryptionKeyPromise) return encryptionKeyPromise

  encryptionKeyPromise = (async () => {
    const storedKey = await runRequest<CryptoKey | undefined>(
      database.transaction(KEYS_STORE, 'readonly').objectStore(KEYS_STORE).get(ENCRYPTION_KEY_ID),
    )
    if (storedKey) return storedKey

    const generatedKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
    await runRequest(
      database.transaction(KEYS_STORE, 'readwrite').objectStore(KEYS_STORE).put(generatedKey, ENCRYPTION_KEY_ID),
    )
    return generatedKey
  })()

  try {
    return await encryptionKeyPromise
  } catch (error) {
    encryptionKeyPromise = null
    throw error
  }
}

function runRequest<T = undefined>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Fallo el almacenamiento local.'))
  })
}

function buildStorageId(
  payload: Pick<OfflineDownload, 'accountId' | 'profileId' | 'contentId' | 'episodeId'>,
): string {
  return [payload.accountId, payload.profileId, payload.contentId, payload.episodeId ?? 'movie'].join(':')
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}
