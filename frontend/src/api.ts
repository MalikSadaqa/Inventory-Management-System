export type HealthResponse = {
  status: string
  database: string
}

export type CustomerListItem = {
  id: number
  name: string
  email: string | null
  created_at: string
  updated_at: string
}

export type CustomerDetail = CustomerListItem & {
  invoices: Array<{
    id: number
    invoice_number: string | null
    total_amount: number | null
    status: string | null
  }>
}

export type CustomerPayload = {
  name: string
  email?: string | null
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:8000'

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`

    try {
      const payload = (await response.json()) as { detail?: string }
      if (payload.detail) {
        message = payload.detail
      }
    } catch {
      // Ignore JSON parsing failures and keep the default message.
    }

    throw new Error(message)
  }

  return (await response.json()) as T
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`)
  return parseJsonResponse<HealthResponse>(response)
}

export async function getCustomers(search?: string): Promise<CustomerListItem[]> {
  const query = new URLSearchParams()
  if (search?.trim()) {
    query.set('search', search.trim())
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/customers${suffix}`)
  return parseJsonResponse<CustomerListItem[]>(response)
}

export async function getCustomer(customerId: number): Promise<CustomerDetail> {
  const response = await fetch(`${API_BASE_URL}/customers/${customerId}`)
  return parseJsonResponse<CustomerDetail>(response)
}

export async function createCustomer(payload: CustomerPayload): Promise<CustomerListItem> {
  const response = await fetch(`${API_BASE_URL}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse<CustomerListItem>(response)
}

export async function updateCustomer(
  customerId: number,
  payload: Partial<CustomerPayload>,
): Promise<CustomerListItem> {
  const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse<CustomerListItem>(response)
}
