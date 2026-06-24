import type {
  Account,
  AuthResponse,
  ChangePasswordPayload,
  CreateProfilePayload,
  LoginPayload,
  ProfileRestrictionsResponse,
  RegisterPayload,
  SetControlParentalPayload,
  SetProfilePinPayload,
  UpdateAccountPayload,
  UpdateProfilePayload,
  UserProfile,
  VerifyProfilePinPayload,
  VerifyProfilePinResponse,
} from '@/types/auth'

const API_BASE_URL = import.meta.env.VITE_USUARIO_API_URL ?? 'http://localhost:8001'

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string | { msg?: string }[] }
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail[0]?.msg ?? 'Ocurrio un error inesperado.'
    }
  } catch {
    // Ignore body parsing errors and use fallback below.
  }

  return 'Ocurrio un error inesperado.'
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as AuthResponse
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as AuthResponse
}

export async function logoutUser(accessToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export async function updateCurrentAccount(
  accessToken: string,
  payload: UpdateAccountPayload,
): Promise<Account> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as Account
}

export async function changePassword(
  accessToken: string,
  payload: ChangePasswordPayload,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export async function listProfiles(accessToken: string): Promise<UserProfile[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/profiles`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as UserProfile[]
}

export async function createProfile(
  accessToken: string,
  payload: CreateProfilePayload,
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as UserProfile
}

export async function updateProfile(
  accessToken: string,
  profileId: string,
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/v1/profiles/${profileId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as UserProfile
}

export async function syncProfilesAvailability(
  accessToken: string,
  maxActiveProfiles: number,
): Promise<UserProfile[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/profiles/sync-availability`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      max_perfiles_activos: maxActiveProfiles,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as UserProfile[]
}

export async function deleteProfile(accessToken: string, profileId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/profiles/${profileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export async function setProfilePin(
  accessToken: string,
  profileId: string,
  payload: SetProfilePinPayload,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/profiles/${profileId}/pin`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export async function removeProfilePin(
  accessToken: string,
  profileId: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/profiles/${profileId}/pin`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export async function verifyProfilePin(
  profileId: string,
  payload: VerifyProfilePinPayload,
): Promise<VerifyProfilePinResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/profiles/${profileId}/verify-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as VerifyProfilePinResponse
}

export async function setProfileControlParental(
  accessToken: string,
  profileId: string,
  payload: SetControlParentalPayload,
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/v1/profiles/${profileId}/control-parental`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as UserProfile
}

export async function getProfileRestrictions(
  accessToken: string,
  profileId: string,
): Promise<ProfileRestrictionsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/profiles/${profileId}/restrictions`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as ProfileRestrictionsResponse
}
