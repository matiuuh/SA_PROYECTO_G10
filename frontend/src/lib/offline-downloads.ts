export interface OfflineDownloadPayload {
  accountId: string
  profileId: string
  contentId: string
  title: string
  type: string
  episodeId?: string
  episodeTitle?: string
  playbackUrl?: string | null
  posterUrl?: string
  downloadedAt: string
}

const DOWNLOADS_KEY = 'quetzal_offline_downloads'

export async function saveEncryptedOfflineDownload(payload: OfflineDownloadPayload): Promise<void> {
  const key = await buildEncryptionKey(`${payload.accountId}:${payload.profileId}`)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encodedPayload = new TextEncoder().encode(JSON.stringify(payload))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedPayload)

  const downloads = readStoredDownloads()
  downloads[buildStorageId(payload)] = {
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted)),
  }

  localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads))
}

function readStoredDownloads(): Record<string, { iv: string; data: string }> {
  try {
    const raw = localStorage.getItem(DOWNLOADS_KEY)
    return raw ? JSON.parse(raw) as Record<string, { iv: string; data: string }> : {}
  } catch {
    return {}
  }
}

async function buildEncryptionKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt'])
}

function buildStorageId(payload: OfflineDownloadPayload): string {
  return [payload.profileId, payload.contentId, payload.episodeId ?? 'movie'].join(':')
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}
