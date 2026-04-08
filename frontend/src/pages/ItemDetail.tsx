import { useEffect, useState } from 'react'

import { getItem, type ItemDetail as ItemDetailResponse } from '../api'
import HelpTooltip from '../components/HelpTooltip'
import { formatDate, formatDateTime, formatMoney, navigateTo } from '../utils'

type LoadState = 'loading' | 'success' | 'error'

function ItemDetail() {
  const pathSegments = window.location.pathname.split('/').filter(Boolean)
  const itemId = pathSegments[1]
  const [item, setItem] = useState<ItemDetailResponse | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const parsedId = Number(itemId)

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setError('Invalid item id.')
      setState('error')
      return
    }

    let cancelled = false

    const loadItem = async () => {
      setState('loading')
      setError(null)

      try {
        const response = await getItem(parsedId)
        if (!cancelled) {
          setItem(response)
          setState('success')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load item.')
          setState('error')
        }
      }
    }

    void loadItem()

    return () => {
      cancelled = true
    }
  }, [itemId])

  return (
    <section style={{ display: 'grid', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, color: '#475569' }}>Item detail</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.8rem' }}>{item?.name ?? 'Loading item'}</h2>
            <HelpTooltip content="Review pricing, category placement, customer tags, and invoice usage for this item." />
          </div>
        </div>
        <a
          href="/items"
          onClick={(event) => {
            event.preventDefault()
            navigateTo('/items')
          }}
          style={backLinkStyle}
        >
          Back to items
        </a>
      </div>

      {state === 'loading' && <div style={panelStyle}>Loading item details...</div>}

      {state === 'error' && <div style={{ ...panelStyle, color: '#b91c1c' }}>{error ?? 'Failed to load item.'}</div>}

      {state === 'success' && item && (
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
                <dd style={valueStyle}>{item.name}</dd>
              </div>
              <div>
                <dt style={labelStyle}>Category</dt>
                <dd style={valueStyle}>
                  <a
                    href={`/categories/${item.category.id}`}
                    onClick={(event) => {
                      event.preventDefault()
                      navigateTo(`/categories/${item.category.id}`)
                    }}
                    style={linkStyle}
                  >
                    {item.category.name}
                  </a>
                </dd>
              </div>
              <div>
                <dt style={labelStyle}>Category Path</dt>
                <dd style={valueStyle}>{item.category_path.join(' / ')}</dd>
              </div>
              <div>
                <dt style={labelStyle}>Price</dt>
                <dd style={valueStyle}>{formatMoney(item.price)}</dd>
              </div>
              <div>
                <dt style={labelStyle}>Cost</dt>
                <dd style={valueStyle}>{formatMoney(item.cost)}</dd>
              </div>
              <div>
                <dt style={labelStyle}>Created</dt>
                <dd style={valueStyle}>{formatDateTime(item.created_at)}</dd>
              </div>
              <div>
                <dt style={labelStyle}>Updated</dt>
                <dd style={valueStyle}>{formatDateTime(item.updated_at)}</dd>
              </div>
            </dl>

            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Details</h3>
              <p style={{ margin: '10px 0 0', color: '#475569', whiteSpace: 'pre-wrap' }}>
                {item.details || 'No additional details provided.'}
              </p>
            </div>
          </div>

          <div style={{ ...panelStyle, display: 'grid', gap: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Customer Tags</h3>
            {item.tagged_customers.length === 0 ? (
              <div style={emptyStateStyle}>This item is not tagged to any customers.</div>
            ) : (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {item.tagged_customers.map((customer) => (
                  <a
                    key={customer.id}
                    href={`/customers/${customer.id}`}
                    onClick={(event) => {
                      event.preventDefault()
                      navigateTo(`/customers/${customer.id}`)
                    }}
                    style={chipLinkStyle}
                  >
                    {customer.name}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...panelStyle, display: 'grid', gap: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Invoices This Item Appeared In</h3>
            {item.invoice_appearances.length === 0 ? (
              <div style={emptyStateStyle}>This item has not appeared on any invoices yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={headerCellStyle}>Invoice</th>
                      <th style={headerCellStyle}>Date</th>
                      <th style={headerCellStyle}>Quantity</th>
                      <th style={headerCellStyle}>Unit Price</th>
                      <th style={headerCellStyle}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.invoice_appearances.map((appearance) => (
                      <tr
                        key={`${appearance.invoice_id}-${appearance.invoice_number}-${appearance.quantity}-${appearance.unit_price}-${appearance.line_total}`}
                        style={{ borderBottom: '1px solid #f1f5f9' }}
                      >
                        <td style={bodyCellStyle}>
                          <a
                            href={`/invoices/${appearance.invoice_id}`}
                            onClick={(event) => {
                              event.preventDefault()
                              navigateTo(`/invoices/${appearance.invoice_id}`)
                            }}
                            style={linkStyle}
                          >
                            {appearance.invoice_number}
                          </a>
                        </td>
                        <td style={bodyCellStyle}>{formatDate(appearance.invoice_date)}</td>
                        <td style={bodyCellStyle}>{appearance.quantity}</td>
                        <td style={bodyCellStyle}>{formatMoney(appearance.unit_price)}</td>
                        <td style={bodyCellStyle}>{formatMoney(appearance.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
  color: '#0f766e',
  textDecoration: 'none',
  fontWeight: 700,
}

const chipLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 12px',
  borderRadius: '999px',
  backgroundColor: '#e0f2fe',
  color: '#075985',
  textDecoration: 'none',
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

const headerCellStyle = {
  padding: '12px 8px',
}

const bodyCellStyle = {
  padding: '14px 8px',
}

export default ItemDetail
