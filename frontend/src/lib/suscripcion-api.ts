import type { SubscriptionPlan, SubscriptionRecord, SubscriptionStatus } from '@/types/subscription'

const API_BASE_URL = import.meta.env.VITE_SUSCRIPCION_API_URL ?? 'http://localhost:8002'

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
  const response = await fetch(`${API_BASE_URL}/api/v1/plans`)

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as SubscriptionPlan[]
}

export async function getSubscriptionByAccount(cuentaId: string): Promise<SubscriptionRecord | null> {
  const response = await fetch(`${API_BASE_URL}/api/v1/subscriptions/account/${cuentaId}`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as SubscriptionRecord
}

export async function getSubscriptionStatusByAccount(cuentaId: string): Promise<SubscriptionStatus> {
  const response = await fetch(`${API_BASE_URL}/api/v1/subscriptions/account/${cuentaId}/status`)

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as SubscriptionStatus
}

export async function createSubscription(
  cuentaId: string,
  planId: string,
): Promise<SubscriptionRecord> {
  const response = await fetch(`${API_BASE_URL}/api/v1/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cuenta_id: cuentaId,
      plan_id: planId,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as SubscriptionRecord
}
