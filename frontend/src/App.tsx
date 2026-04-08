import { useCallback, useEffect, useMemo, useState } from 'react'

import { getHealth, type HealthResponse } from './api'
import Categories from './pages/Categories'
import CategoryDetail from './pages/CategoryDetail'
import CustomerDetail from './pages/CustomerDetail'
import Customers from './pages/Customers'
import InvoiceDetail from './pages/InvoiceDetail'
import InvoiceLineSearch from './pages/InvoiceLineSearch'
import Invoices from './pages/Invoices'
import ItemDetail from './pages/ItemDetail'
import Items from './pages/Items'
import { navigateTo } from './utils'

type LoadState = 'loading' | 'success' | 'error'
const navLinks = [
  { href: '/customers', label: 'Customers' },
  { href: '/categories', label: 'Categories' },
  { href: '/items', label: 'Items' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/search/invoice-lines', label: 'Line Search' },
] as const

function getCurrentPath(): string {
  return window.location.pathname
}

function getPageTitle(path: string): string {
  if (path.startsWith('/categories')) {
    return 'Categories'
  }

  if (path.startsWith('/items')) {
    return 'Items'
  }

  if (path.startsWith('/invoices')) {
    return 'Invoices'
  }

  if (path.startsWith('/search/invoice-lines')) {
    return 'Invoice Line Search'
  }

  return 'Customers'
}

function App() {
  const [path, setPath] = useState(getCurrentPath)
  const [state, setState] = useState<LoadState>('loading')
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const response = await getHealth()
        setHealth(response)
        setState('success')
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to reach backend health endpoint.',
        )
        setState('error')
      }
    }

    void loadHealth()
  }, [])

  useEffect(() => {
    const handleLocationChange = () => setPath(getCurrentPath())

    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  const renderPage = useCallback(() => {
    if (path === '/' || path === '') {
      navigateTo('/customers')
      return null
    }

    if (path === '/customers') {
      return <Customers />
    }

    if (/^\/customers\/\d+$/.test(path)) {
      return <CustomerDetail />
    }

    if (path === '/categories') {
      return <Categories />
    }

    if (/^\/categories\/\d+$/.test(path)) {
      return <CategoryDetail />
    }

    if (path === '/items') {
      return <Items />
    }

    if (/^\/items\/\d+$/.test(path)) {
      return <ItemDetail />
    }

    if (path === '/invoices') {
      return <Invoices />
    }

    if (/^\/invoices\/\d+$/.test(path)) {
      return <InvoiceDetail />
    }

    if (path === '/search/invoice-lines') {
      return <InvoiceLineSearch />
    }

    return <Customers />
  }, [path])

  const pageTitle = useMemo(() => getPageTitle(path), [path])
  const renderedPage = useMemo(() => renderPage(), [renderPage])

  return (
    <div
      style={{
        minHeight: '100vh',
        margin: 0,
        background:
          'linear-gradient(160deg, #f8fafc 0%, #ecfeff 45%, #e0f2fe 100%)',
        color: '#0f172a',
        fontFamily: '"Segoe UI", sans-serif',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            alignItems: 'center',
            marginBottom: '24px',
            padding: '20px 24px',
            borderRadius: '20px',
            backgroundColor: '#ffffff',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
              Inventory Management System
            </p>
            <h1 style={{ margin: '8px 0 0', fontSize: '2rem' }}>{pageTitle}</h1>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <p
              style={{
                margin: 0,
                padding: '10px 14px',
                borderRadius: '999px',
                backgroundColor:
                  state === 'success' && health?.status === 'ok' ? '#dcfce7' : '#fee2e2',
                color: state === 'success' && health?.status === 'ok' ? '#166534' : '#b91c1c',
                fontSize: '0.9rem',
              }}
            >
              {state === 'loading' && 'Checking backend'}
              {state === 'error' && `Backend issue: ${error}`}
              {state === 'success' && health && `Backend ${health.status} / DB ${health.database}`}
            </p>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => {
                  event.preventDefault()
                  navigateTo(link.href)
                }}
                style={{
                  color: path.startsWith(link.href) ? '#0f172a' : '#475569',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </header>

        {renderedPage}
      </div>
    </div>
  )
}

export default App
