import { useEffect, useState } from 'react'

import { getCustomer, type CustomerDetail as CustomerDetailResponse } from '../api'
import HelpTooltip from '../components/HelpTooltip'
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
    <section style={{ display: 'grid', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, color: '#475569' }}>Customer detail</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.8rem' }}>
              {customer?.name ?? 'Loading customer'}
            </h2>
            <HelpTooltip content="Review customer contact details, invoice history, and tagged item relationships in one place." />
          </div>
        </div>
        <a
          href="/customers"
          onClick={(event) => {
            event.preventDefault()
            navigateTo('/customers')
          }}
          style={backLinkStyle}
        >
          Back to customers
        </a>
      </div>

      {state === 'loading' && <div style={panelStyle}>Loading customer details...</div>}

      {state === 'error' && <div style={{ ...panelStyle, color: '#b91c1c' }}>{error ?? 'Failed to load customer.'}</div>}

      {state === 'success' && customer && (
        <>
          <div style={{ ...panelStyle, display: 'grid', gap: '20px' }}>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                margin: 0,
              }}
            >
              <div>
                <dt style={labelStyle}>Name</dt>
                <dd style={valueStyle}>{customer.name}</dd>
              </div>
              <div>
                <dt style={labelStyle}>Email</dt>
                <dd style={valueStyle}>{customer.email || 'No email'}</dd>
              </div>
              <div>
                <dt style={labelStyle}>Phone</dt>
                <dd style={valueStyle}>{customer.phone || 'No phone'}</dd>
              </div>
              <div>
                <dt style={labelStyle}>Created</dt>
                <dd style={valueStyle}>{formatDateTime(customer.created_at)}</dd>
              </div>
              <div>
                <dt style={labelStyle}>Updated</dt>
                <dd style={valueStyle}>{formatDateTime(customer.updated_at)}</dd>
              </div>
            </dl>
          </div>

          <div style={{ ...panelStyle, display: 'grid', gap: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Invoices</h3>
            {customer.invoices.length === 0 ? (
              <div style={emptyStateStyle}>No invoices available for this customer yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
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
                      <a
                        href={`/invoices/${invoice.id}`}
                        onClick={(event) => {
                          event.preventDefault()
                          navigateTo(`/invoices/${invoice.id}`)
                        }}
                        style={linkStyle}
                      >
                        {invoice.invoice_number || `Invoice #${invoice.id}`}
                      </a>
                      <span style={{ color: '#475569' }}>
                        {invoice.invoice_date ? formatDate(invoice.invoice_date) : 'No invoice date'}
                      </span>
                      <span style={{ color: '#475569' }}>
                        Total {invoice.total ? formatMoney(invoice.total) : '0.00'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...panelStyle, display: 'grid', gap: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Tagged Items</h3>
            {customer.tagged_items.length === 0 ? (
              <div style={emptyStateStyle}>This customer is not tagged on any items.</div>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                {customer.tagged_items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '16px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <a
                        href={`/items/${item.id}`}
                        onClick={(event) => {
                          event.preventDefault()
                          navigateTo(`/items/${item.id}`)
                        }}
                        style={linkStyle}
                      >
                        {item.name}
                      </a>
                      <span style={{ color: '#475569' }}>Catalog price {formatMoney(item.price)}</span>
                    </div>
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

const panelStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  padding: '24px',
  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
}

const labelStyle = {
  color: '#475569',
  fontSize: '0.9rem',
}

const valueStyle = {
  margin: '8px 0 0',
  fontWeight: 600,
}

const linkStyle = {
  textDecoration: 'none',
  color: '#0f766e',
  fontWeight: 700,
}

const backLinkStyle = {
  alignSelf: 'start',
  textDecoration: 'none',
  color: '#0369a1',
  fontWeight: 600,
}

const emptyStateStyle = {
  border: '1px dashed #cbd5e1',
  borderRadius: '16px',
  padding: '24px',
  color: '#475569',
}

export default CustomerDetail
