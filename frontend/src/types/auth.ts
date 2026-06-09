export interface Account {
  id: string
  nombre: string
  correo: string
  pais: string
  rol: string
  creado_en: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_at: string
  account: Account
}

export interface AuthSession {
  accessToken: string
  tokenType: string
  expiresAt: string
  account: Account
}

export interface UserProfile {
  id: string
  cuenta_id: string
  nombre: string
  color: string
  es_principal: boolean
  activo: boolean
  creado_en: string
  actualizado_en: string
}

export interface LoginPayload {
  correo: string
  contrasena: string
}

export interface RegisterPayload {
  nombre: string
  correo: string
  contrasena: string
  pais: string
}

export interface CreateProfilePayload {
  nombre: string
  color: string
  es_principal?: boolean
}

export interface UpdateProfilePayload {
  nombre?: string
  color?: string
  es_principal?: boolean
}
