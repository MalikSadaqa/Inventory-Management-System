import { useEffect, useState } from 'react'

import { getCustomer, type CustomerDetail as CustomerDetailResponse } from '../api'
import { formatDateTime, navigateTo } from '../utils'

type LoadState = 'loading' | 'success' | 'error'

function CustomerDetail() {
  const pathSegments = window.location.pathname.split('/').filter(Boolean)
  const customerId = pathSegments[1]
  const [customer, setCustomer] = useState<CustomerDetailResponse | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const parsedId = Number(customerId)

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setError('Invalid customer id.')
      setState('error')
      return
    }

    let cancelled = false

    const loadCustomer = async () => {
      setState('loading')
      setError(null)

      try {
        const response = await getCustomer(parsedId)
        if (!cancelled) {
          setCustomer(response)
          setState('success')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load customer.')
          setState('error')
        }
      }
    }

    void loadCustomer()

    return () => {
      cancelled = true
    }
  }, [customerId])

  return (
    <section
      style={{
        display: 'grid',
        gap: '24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <p style={{ margin: 0, color: '#475569' }}>Customer detail</p>
          <h2 style={{ margin: '8px 0 0', fontSize: '1.8rem' }}>
            {customer?.name ?? 'Loading customer'}
          </h2>
        </div>
        <a
          href="/customers"
          onClick={(event) => {
            event.preventDefault()
            navigateTo('/customers')
          }}
          style={{
            alignSelf: 'start',
            textDecoration: 'none',
            color: '#0369a1',
            fontWeight: 600,
          }}
        >
          Back to customers
        </a>
      </div>

      {state === 'loading' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
          }}
        >
          Loading customer details...
        </div>
      )}

      {state === 'error' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
            color: '#b91c1c',
          }}
        >
          {error ?? 'Failed to load customer.'}
        </div>
      )}

      {state === 'success' && customer && (
        <>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
            }}
          >
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                margin: 0,
              }}
            >
              <div>
                <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Name</dt>
                <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>{customer.name}</dd>
              </div>
              <div>
                <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Email</dt>
                <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>
                  {customer.email || 'No email'}
                </dd>
              </div>
              <div>
                <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Created</dt>
                <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>
                  {formatDateTime(customer.created_at)}
                </dd>
              </div>
              <div>
                <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Updated</dt>
                <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>
                  {formatDateTime(customer.updated_at)}
                </dd>
              </div>
            </dl>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Invoices</h3>
            <p style={{ margin: '8px 0 0', color: '#475569' }}>
              Future invoices for this customer will appear here.
            </p>

            {customer.invoices.length === 0 ? (
              <div
                style={{
                  marginTop: '20px',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '16px',
                  padding: '24px',
                  color: '#475569',
                }}
              >
                No invoices available for this customer yet.
              </div>
            ) : (
              <ul style={{ margin: '20px 0 0', paddingLeft: '20px' }}>
                {customer.invoices.map((invoice) => (
                  <li key={invoice.id}>
                    {invoice.invoice_number || `Invoice #${invoice.id}`} {invoice.status || ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default CustomerDetail
