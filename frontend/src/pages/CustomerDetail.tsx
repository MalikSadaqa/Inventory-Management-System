import { useEffect, useState } from 'react'

import { getCustomer, type CustomerDetail as CustomerDetailResponse } from '../api'
import { formatDate, formatDateTime, formatMoney, navigateTo } from '../utils'

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
                <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Phone</dt>
                <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>
                  {customer.phone || 'No phone'}
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
              Invoice history for this customer.
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
              <div style={{ marginTop: '20px', display: 'grid', gap: '14px' }}>
                {customer.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <strong>{invoice.invoice_number || `Invoice #${invoice.id}`}</strong>
                      <span style={{ color: '#475569' }}>
                        {invoice.invoice_date ? formatDate(invoice.invoice_date) : 'No invoice date'}
                      </span>
                      <span style={{ color: '#475569' }}>
                        Total {invoice.total ? formatMoney(invoice.total) : '0.00'}
                      </span>
                    </div>
                    <a
                      href={`/invoices/${invoice.id}`}
                      onClick={(event) => {
                        event.preventDefault()
                        navigateTo(`/invoices/${invoice.id}`)
                      }}
                      style={{
                        textDecoration: 'none',
                        color: '#0f766e',
                        fontWeight: 700,
                      }}
                    >
                      Open Invoice
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default CustomerDetail
