import { useEffect, useState, type CSSProperties } from 'react'

import {
  downloadInvoiceExcel,
  getInvoicePdfUrl,
  getInvoice,
  type InvoiceDetail as InvoiceDetailResponse,
} from '../api'
import { formatDate, formatDateTime, formatMoney, formatPercent, navigateTo } from '../utils'

type LoadState = 'loading' | 'success' | 'error'

function InvoiceDetail() {
  const pathSegments = window.location.pathname.split('/').filter(Boolean)
  const invoiceId = pathSegments[1]
  const [invoice, setInvoice] = useState<InvoiceDetailResponse | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const parsedId = Number(invoiceId)

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setError('Invalid invoice id.')
      setState('error')
      return
    }

    let cancelled = false

    const loadInvoice = async () => {
      setState('loading')
      setError(null)

      try {
        const response = await getInvoice(parsedId)
        if (!cancelled) {
          setInvoice(response)
          setState('success')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load invoice.')
          setState('error')
        }
      }
    }

    void loadInvoice()

    return () => {
      cancelled = true
    }
  }, [invoiceId])

  return (
    <section style={{ display: 'grid', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, color: '#475569' }}>Invoice detail</p>
          <h2 style={{ margin: '8px 0 0', fontSize: '1.8rem' }}>
            {invoice?.invoice_number ?? 'Loading invoice'}
          </h2>
        </div>
        <a
          href="/invoices"
          onClick={(event) => {
            event.preventDefault()
            navigateTo('/invoices')
          }}
          style={{
            alignSelf: 'start',
            textDecoration: 'none',
            color: '#0369a1',
            fontWeight: 600,
          }}
        >
          Back to invoices
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
          Loading invoice details...
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
          {error ?? 'Failed to load invoice.'}
        </div>
      )}

      {state === 'success' && invoice && (
        <>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
              display: 'grid',
              gap: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ color: '#475569', fontSize: '0.9rem' }}>Invoice actions</div>
                <div style={{ marginTop: '6px', color: '#0f172a', fontWeight: 600 }}>
                  Open the invoice PDF in a new tab or export the invoice workbook.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null)
                    const pdfWindow = window.open(getInvoicePdfUrl(invoice.id), '_blank', 'noopener,noreferrer')
                    if (!pdfWindow) {
                      setActionError('Failed to open PDF. Please allow pop-ups for this site.')
                    }
                  }}
                  style={secondaryButtonStyle}
                >
                  View PDF
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setActionError(null)
                    try {
                      await downloadInvoiceExcel(invoice.id)
                    } catch (downloadError) {
                      setActionError(
                        downloadError instanceof Error ? downloadError.message : 'Failed to export Excel.',
                      )
                    }
                  }}
                  style={primaryButtonStyle}
                >
                  Export Excel
                </button>
              </div>
            </div>

            {actionError && <p style={{ margin: 0, color: '#b91c1c' }}>{actionError}</p>}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
              }}
            >
              <div>
                <div style={{ color: '#475569', fontSize: '0.9rem' }}>Invoice Number</div>
                <div style={{ marginTop: '8px', fontWeight: 700 }}>{invoice.invoice_number}</div>
              </div>
              <div>
                <div style={{ color: '#475569', fontSize: '0.9rem' }}>Invoice Date</div>
                <div style={{ marginTop: '8px', fontWeight: 700 }}>{formatDate(invoice.invoice_date)}</div>
              </div>
              <div>
                <div style={{ color: '#475569', fontSize: '0.9rem' }}>Customer</div>
                <div style={{ marginTop: '8px', fontWeight: 700 }}>
                  <a
                    href={`/customers/${invoice.customer.id}`}
                    onClick={(event) => {
                      event.preventDefault()
                      navigateTo(`/customers/${invoice.customer.id}`)
                    }}
                    style={{ color: '#0f766e', textDecoration: 'none', fontWeight: 700 }}
                  >
                    {invoice.customer.name}
                  </a>
                </div>
                <div style={{ marginTop: '4px', color: '#475569' }}>
                  {invoice.customer.email || 'No email'}
                </div>
                <div style={{ marginTop: '4px', color: '#475569' }}>
                  {invoice.customer.phone || 'No phone'}
                </div>
              </div>
              <div>
                <div style={{ color: '#475569', fontSize: '0.9rem' }}>Created</div>
                <div style={{ marginTop: '8px', fontWeight: 700 }}>{formatDateTime(invoice.created_at)}</div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 8px' }}>Item Snapshot</th>
                    <th style={{ padding: '12px 8px' }}>Category Snapshot</th>
                    <th style={{ padding: '12px 8px' }}>Unit Price</th>
                    <th style={{ padding: '12px 8px' }}>Quantity</th>
                    <th style={{ padding: '12px 8px' }}>Line Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line) => (
                    <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 8px' }}>
                        <div style={{ fontWeight: 600 }}>
                          {line.item_id ? (
                            <a
                              href={`/items/${line.item_id}`}
                              onClick={(event) => {
                                event.preventDefault()
                                navigateTo(`/items/${line.item_id}`)
                              }}
                              style={{ color: '#0f766e', textDecoration: 'none', fontWeight: 700 }}
                            >
                              {line.item_name_snapshot}
                            </a>
                          ) : (
                            line.item_name_snapshot
                          )}
                        </div>
                        <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.9rem' }}>
                          Source item id {line.item_id ?? 'Removed'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 8px', color: '#475569' }}>
                        {line.category_path_snapshot || 'No category snapshot'}
                      </td>
                      <td style={{ padding: '14px 8px' }}>{formatMoney(line.unit_price_snapshot)}</td>
                      <td style={{ padding: '14px 8px' }}>{line.quantity}</td>
                      <td style={{ padding: '14px 8px', fontWeight: 600 }}>
                        {formatMoney(line.line_subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '20px',
              }}
            >
              <div>
                <div style={{ color: '#475569', fontSize: '0.9rem' }}>Total Quantity</div>
                <div style={{ marginTop: '8px', fontSize: '1.35rem', fontWeight: 700 }}>
                  {invoice.total_quantity}
                </div>
              </div>
              <div>
                <div style={{ color: '#475569', fontSize: '0.9rem' }}>Subtotal</div>
                <div style={{ marginTop: '8px', fontSize: '1.35rem', fontWeight: 700 }}>
                  {formatMoney(invoice.subtotal)}
                </div>
              </div>
              <div>
                <div style={{ color: '#475569', fontSize: '0.9rem' }}>Tax Rate</div>
                <div style={{ marginTop: '8px', fontSize: '1.35rem', fontWeight: 700 }}>
                  {formatPercent(invoice.tax_rate)}
                </div>
              </div>
              <div>
                <div style={{ color: '#475569', fontSize: '0.9rem' }}>Tax Amount</div>
                <div style={{ marginTop: '8px', fontSize: '1.35rem', fontWeight: 700 }}>
                  {formatMoney(invoice.tax_amount)}
                </div>
              </div>
              <div>
                <div style={{ color: '#475569', fontSize: '0.9rem' }}>Total</div>
                <div style={{ marginTop: '8px', fontSize: '1.5rem', fontWeight: 700 }}>
                  {formatMoney(invoice.total)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

const primaryButtonStyle: CSSProperties = {
  border: '1px solid #0f766e',
  borderRadius: '12px',
  padding: '10px 14px',
  backgroundColor: '#0f766e',
  color: '#ffffff',
  fontWeight: 700,
  cursor: 'pointer',
}

const secondaryButtonStyle: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: '12px',
  padding: '10px 14px',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontWeight: 600,
  cursor: 'pointer',
}

export default InvoiceDetail
