export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString()
}

export function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString()
}

export function formatMoney(value: string | number): string {
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? amount.toFixed(2) : String(value)
}

export function formatPercent(value: string | number): string {
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? `${(amount * 100).toFixed(2)}%` : String(value)
}

export function todayDateInputValue(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function navigateTo(path: string): void {
  if (window.location.pathname === path) {
    return
  }

  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
