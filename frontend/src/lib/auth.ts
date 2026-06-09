import type { AuthSession, UserProfile } from '@/types/auth'

const SESSION_STORAGE_KEY = 'quetzal_auth_session'
const ACTIVE_PROFILE_STORAGE_KEY = 'quetzal_active_profile'

export function getStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function storeSession(session: AuthSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY)
  localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY)
}

export function clearActiveProfile(): void {
  localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY)
}

export function isSessionActive(session: AuthSession | null): boolean {
  if (!session) return false
  return new Date(session.expiresAt).getTime() > Date.now()
}

export function getActiveSession(): AuthSession | null {
  const session = getStoredSession()
  if (!isSessionActive(session)) {
    clearSession()
    return null
  }
  return session
}

export function storeActiveProfile(profile: UserProfile): void {
  localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

export function getStoredActiveProfile(): UserProfile | null {
  const raw = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY)
    return null
  }
}

export function syncStoredActiveProfile(profiles: UserProfile[]): UserProfile | null {
  const storedProfile = getStoredActiveProfile()
  const activeProfiles = profiles.filter((profile) => profile.activo)
  if (!storedProfile) return null

  const validProfile = activeProfiles.find((profile) => profile.id === storedProfile.id) ?? null
  if (!validProfile) {
    const fallbackProfile =
      activeProfiles.find((profile) => profile.es_principal) ?? activeProfiles[0] ?? null
    if (!fallbackProfile) {
      clearActiveProfile()
      return null
    }
    storeActiveProfile(fallbackProfile)
    return fallbackProfile
  }

  storeActiveProfile(validProfile)
  return validProfile
}
