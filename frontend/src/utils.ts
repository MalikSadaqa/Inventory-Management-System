export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString()
}

export function navigateTo(path: string): void {
  if (window.location.pathname === path) {
    return
  }

  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
