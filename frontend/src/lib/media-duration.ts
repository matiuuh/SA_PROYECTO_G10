export interface VideoDuration {
  seconds: number
  minutesForStorage: number
  label: string
}

export async function getVideoDuration(file: File): Promise<VideoDuration> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const seconds = await new Promise<number>((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        const duration = video.duration
        if (!Number.isFinite(duration) || duration <= 0) {
          reject(new Error('No se pudo leer la duracion del video.'))
          return
        }
        resolve(Math.round(duration))
      }
      video.onerror = () => reject(new Error('No se pudo leer la metadata del video.'))
      video.src = objectUrl
    })

    return {
      seconds,
      minutesForStorage: Math.max(1, Math.ceil(seconds / 60)),
      label: formatVideoDuration(seconds),
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function formatVideoDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
