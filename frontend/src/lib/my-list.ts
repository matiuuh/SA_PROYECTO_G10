const MY_LIST_PREFIX = 'quetzal_my_list'

function buildMyListKey(profileId: string): string {
  return `${MY_LIST_PREFIX}:${profileId}`
}

export function getMyList(profileId: string): string[] {
  const raw = localStorage.getItem(buildMyListKey(profileId))
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    localStorage.removeItem(buildMyListKey(profileId))
    return []
  }
}

export function isInMyList(profileId: string, contentId: string): boolean {
  return getMyList(profileId).includes(contentId)
}

export function addToMyList(profileId: string, contentId: string): string[] {
  const current = getMyList(profileId)
  if (current.includes(contentId)) return current

  const next = [contentId, ...current]
  localStorage.setItem(buildMyListKey(profileId), JSON.stringify(next))
  return next
}

export function removeFromMyList(profileId: string, contentId: string): string[] {
  const next = getMyList(profileId).filter((item) => item !== contentId)
  localStorage.setItem(buildMyListKey(profileId), JSON.stringify(next))
  return next
}

export function toggleMyListItem(profileId: string, contentId: string): {
  inList: boolean
  items: string[]
} {
  if (isInMyList(profileId, contentId)) {
    const items = removeFromMyList(profileId, contentId)
    return { inList: false, items }
  }

  const items = addToMyList(profileId, contentId)
  return { inList: true, items }
}
