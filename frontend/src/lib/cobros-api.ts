import type { ProcessPaymentPayload, ProcessPaymentResponse } from '@/types/cobros'
import { getActiveSession } from '@/lib/auth'

const API_BASE_URL = import.meta.env.VITE_COBROS_API_URL ?? 'http://localhost:8006'

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string }
    if (typeof data.detail === 'string') return data.detail
  } catch {
    // Ignore parse errors and use fallback below.
  }

  return 'No se pudo procesar el pago.'
}

export async function processPayment(payload: ProcessPaymentPayload): Promise<ProcessPaymentResponse> {
  const session = getActiveSession()
  const response = await fetch(`${API_BASE_URL}/api/v1/payments/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as ProcessPaymentResponse
}
