import type {
  PlanQuote,
  SubscriptionMessage,
  SubscriptionPlan,
  SubscriptionRecord,
  SubscriptionStatus,
} from '@/types/subscription'
import { getActiveSession } from '@/lib/auth'

const API_BASE_URL = import.meta.env.VITE_SUSCRIPCION_API_URL ?? 'http://localhost:8002'
const PLANS_CACHE_TTL_MS = 5 * 60 * 1000
const STATUS_CACHE_TTL_MS = 30 * 1000

let plansCache: { expiresAt: number; data: SubscriptionPlan[] } | null = null
const statusCache = new Map<string, { expiresAt: number; data: SubscriptionStatus }>()

function authHeaders(): Record<string, string> {
  const session = getActiveSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.accessToken}` }
}

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

export async function listActivePlans(): Promise<SubscriptionPlan[]> {
  if (plansCache && plansCache.expiresAt > Date.now()) {
    return plansCache.data
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/plans`)

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as SubscriptionPlan[]
  plansCache = {
    expiresAt: Date.now() + PLANS_CACHE_TTL_MS,
    data,
  }
  return data
}

export async function getPlanQuote(planId: string, pais: string): Promise<PlanQuote> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/plans/${planId}/quote?pais=${encodeURIComponent(pais)}`,
    { headers: { ...authHeaders() } },
  )

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as PlanQuote
}

export async function getSubscriptionByAccount(cuentaId: string): Promise<SubscriptionRecord | null> {
  const response = await fetch(`${API_BASE_URL}/api/v1/subscriptions/account/${cuentaId}`, {
    headers: { ...authHeaders() },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as SubscriptionRecord
}

export async function getSubscriptionStatusByAccount(cuentaId: string): Promise<SubscriptionStatus> {
  const cached = statusCache.get(cuentaId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/subscriptions/account/${cuentaId}/status`, {
    headers: { ...authHeaders() },
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as SubscriptionStatus
  statusCache.set(cuentaId, {
    expiresAt: Date.now() + STATUS_CACHE_TTL_MS,
    data,
  })
  return data
}

export async function createSubscription(
  cuentaId: string,
  planId: string,
): Promise<SubscriptionRecord> {
  const response = await fetch(`${API_BASE_URL}/api/v1/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      cuenta_id: cuentaId,
      plan_id: planId,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const subscription = (await response.json()) as SubscriptionRecord
  invalidateSubscriptionStatus(cuentaId)
  return subscription
}

export async function changeSubscriptionPlan(
  suscripcionId: string,
  planId: string,
): Promise<SubscriptionRecord> {
  const response = await fetch(`${API_BASE_URL}/api/v1/subscriptions/${suscripcionId}/plan`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      plan_id: planId,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const subscription = (await response.json()) as SubscriptionRecord
  invalidateSubscriptionStatus(subscription.cuenta_id)
  return subscription
}

export async function cancelSubscription(suscripcionId: string): Promise<SubscriptionMessage> {
  const response = await fetch(`${API_BASE_URL}/api/v1/subscriptions/${suscripcionId}/cancel`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  statusCache.clear()
  return (await response.json()) as SubscriptionMessage
}

export function invalidateSubscriptionStatus(cuentaId?: string): void {
  if (cuentaId) {
    statusCache.delete(cuentaId)
    return
  }
  statusCache.clear()
}

export function invalidatePlansCache(): void {
  plansCache = null
}
