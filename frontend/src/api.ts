export type HealthResponse = {
  status: string
  database: string
}

export type CustomerListItem = {
  id: number
  name: string
  email: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export type CustomerDetail = CustomerListItem & {
  invoices: Array<{
    id: number
    invoice_number: string
    invoice_date: string | null
    total: string | null
  }>
}

export type CustomerPayload = {
  name: string
  email?: string | null
  phone?: string | null
}

export type CategoryListItem = {
  id: number
  name: string
  parent_id: number | null
  created_at: string
  updated_at: string
}

export type CategoryTreeNode = {
  id: number
  name: string
  parent_id: number | null
  children: CategoryTreeNode[]
  is_leaf: boolean
}

export type CategoryDetail = CategoryListItem & {
  parent: {
    id: number
    name: string
  } | null
  path: string[]
  children_tree: CategoryTreeNode[]
  is_leaf: boolean
}

export type CategoryPayload = {
  name: string
  parent_id?: number | null
}

export type ItemListItem = {
  id: number
  name: string
  price: string
  cost: string
  category_id: number
  details: string | null
  created_at: string
  updated_at: string
}

export type ItemDetail = {
  id: number
  name: string
  price: string
  cost: string
  details: string | null
  category: {
    id: number
    name: string
  }
  category_path: string[]
  created_at: string
  updated_at: string
}

export type ItemPayload = {
  name: string
  price: string
  cost: string
  category_id: number
  details?: string | null
}

export type InvoiceLinePayload = {
  item_id: number
  quantity: number
}

export type InvoicePayload = {
  customer_id: number
  invoice_date: string
  items: InvoiceLinePayload[]
}

export type InvoiceLine = {
  id: number
  item_id: number | null
  item_name_snapshot: string
  unit_price_snapshot: string
  unit_cost_snapshot: string | null
  category_id_snapshot: number | null
  category_path_snapshot: string | null
  quantity: number
  line_subtotal: string
}

export type InvoiceSummary = {
  id: number
  invoice_number: string
  invoice_date: string
  total_quantity: number
  subtotal: string
  tax_rate: string
  tax_amount: string
  total: string
  created_at: string
  updated_at: string
}

export type InvoiceDetail = InvoiceSummary & {
  customer: {
    id: number
    name: string
    email: string | null
    phone: string | null
  }
  lines: InvoiceLine[]
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

async function fetchBlobResponse(response: Response): Promise<Blob> {
  if (!response.ok) {
    await parseJsonResponse(response)
  }

  return response.blob()
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

export async function deleteCustomer(customerId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    await parseJsonResponse(response)
  }
}

export async function getCategories(): Promise<CategoryListItem[]> {
  const response = await fetch(`${API_BASE_URL}/categories`)
  return parseJsonResponse<CategoryListItem[]>(response)
}

export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const response = await fetch(`${API_BASE_URL}/categories/tree`)
  return parseJsonResponse<CategoryTreeNode[]>(response)
}

export async function getCategory(categoryId: number): Promise<CategoryDetail> {
  const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`)
  return parseJsonResponse<CategoryDetail>(response)
}

export async function createCategory(payload: CategoryPayload): Promise<CategoryListItem> {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse<CategoryListItem>(response)
}

export async function updateCategory(
  categoryId: number,
  payload: Partial<CategoryPayload>,
): Promise<CategoryListItem> {
  const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse<CategoryListItem>(response)
}

export async function deleteCategory(categoryId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    await parseJsonResponse(response)
  }
}

export async function getItems(
  search?: string,
  categoryId?: number | null,
): Promise<ItemListItem[]> {
  const query = new URLSearchParams()
  if (search?.trim()) {
    query.set('search', search.trim())
  }
  if (categoryId) {
    query.set('category_id', String(categoryId))
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/items${suffix}`)
  return parseJsonResponse<ItemListItem[]>(response)
}

export async function getItem(itemId: number): Promise<ItemDetail> {
  const response = await fetch(`${API_BASE_URL}/items/${itemId}`)
  return parseJsonResponse<ItemDetail>(response)
}

export async function createItem(payload: ItemPayload): Promise<ItemListItem> {
  const response = await fetch(`${API_BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse<ItemListItem>(response)
}

export async function updateItem(
  itemId: number,
  payload: Partial<ItemPayload>,
): Promise<ItemListItem> {
  const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse<ItemListItem>(response)
}

export async function deleteItem(itemId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    await parseJsonResponse(response)
  }
}

export async function getInvoices(): Promise<InvoiceSummary[]> {
  const response = await fetch(`${API_BASE_URL}/invoices`)
  return parseJsonResponse<InvoiceSummary[]>(response)
}

export async function getInvoice(invoiceId: number): Promise<InvoiceDetail> {
  const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`)
  return parseJsonResponse<InvoiceDetail>(response)
}

export async function createInvoice(payload: InvoicePayload): Promise<InvoiceDetail> {
  const response = await fetch(`${API_BASE_URL}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse<InvoiceDetail>(response)
}

export function getInvoicePdfUrl(invoiceId: number): string {
  return `${API_BASE_URL}/invoices/${invoiceId}/pdf`
}

export async function downloadInvoiceExcel(invoiceId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/excel`)
  const blob = await fetchBlobResponse(response)
  downloadBlob(blob, getFilenameFromDisposition(response.headers.get('content-disposition')) || `invoice-${invoiceId}.xlsx`)
}

function getFilenameFromDisposition(value: string | null): string | null {
  if (!value) {
    return null
  }

  const match = value.match(/filename="([^"]+)"/i)
  return match?.[1] ?? null
}

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0)
}
