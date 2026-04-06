import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  createInvoice,
  getCustomers,
  getInvoices,
  getItems,
  type CustomerListItem,
  type InvoicePayload,
  type InvoiceSummary,
  type ItemListItem,
} from '../api'
import EntityAutocomplete, { type AutocompleteOption } from '../components/EntityAutocomplete'
import InvoiceLineEditor, {
  type InvoiceItemOption,
  type InvoiceLineDraft,
} from '../components/InvoiceLineEditor'
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatPercent,
  navigateTo,
  todayDateInputValue,
} from '../utils'

type LoadState = 'loading' | 'success' | 'error'

type CustomerOption = AutocompleteOption & {
  email?: string | null
}

const TAX_RATE = 0.16

function createEmptyLine(): InvoiceLineDraft {
  return {
    key: crypto.randomUUID(),
    item: null,
    quantity: 1,
  }
}

function mapCustomerOption(customer: CustomerListItem): CustomerOption {
  return {
    id: customer.id,
    label: customer.name,
    description: customer.email || 'No email',
    email: customer.email,
  }
}

function mapItemOption(item: ItemListItem): InvoiceItemOption {
  return {
    id: item.id,
    label: item.name,
    description: `Price ${formatMoney(item.price)}`,
    price: item.price,
    categoryPath: null,
  }
}

function Invoices() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [invoiceState, setInvoiceState] = useState<LoadState>('loading')
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [invoiceDate, setInvoiceDate] = useState(todayDateInputValue())
  const [lines, setLines] = useState<InvoiceLineDraft[]>([createEmptyLine()])
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadInvoices = async () => {
      setInvoiceState('loading')
      setInvoiceError(null)

      try {
        const response = await getInvoices()
        if (!cancelled) {
          setInvoices(response)
          setInvoiceState('success')
        }
      } catch (loadError) {
        if (!cancelled) {
          setInvoiceError(loadError instanceof Error ? loadError.message : 'Failed to load invoices.')
          setInvoiceState('error')
        }
      }
    }

    void loadInvoices()

    return () => {
      cancelled = true
    }
  }, [])

  const customerLoader = useCallback(async (search: string) => {
    const response = await getCustomers(search)
    return response.map(mapCustomerOption)
  }, [])

  const itemLoader = useCallback(async (search: string) => {
    const response = await getItems(search)
    return response.map(mapItemOption)
  }, [])

  const totals = useMemo(() => {
    const totalQuantity = lines.reduce((sum, line) => sum + Math.max(line.quantity || 0, 0), 0)
    const subtotal = lines.reduce((sum, line) => {
      const unitPrice = Number(line.item?.price ?? 0)
      return sum + unitPrice * Math.max(line.quantity || 0, 0)
    }, 0)
    const taxAmount = subtotal * TAX_RATE
    const total = subtotal + taxAmount

    return { totalQuantity, subtotal, taxAmount, total }
  }, [lines])

  const resetForm = () => {
    setSelectedCustomer(null)
    setInvoiceDate(todayDateInputValue())
    setLines([createEmptyLine()])
    setFormError(null)
  }

  const handleLineItemSelect = (key: string, item: InvoiceItemOption) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, item, quantity: Math.max(line.quantity, 1) } : line)),
    )
  }

  const handleLineItemClear = (key: string) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, item: null } : line)))
  }

  const handleLineQuantityChange = (key: string, quantity: number) => {
    setLines((current) =>
      current.map((line) =>
        line.key === key
          ? { ...line, quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 0 }
          : line,
      ),
    )
  }

  const handleRemoveLine = (key: string) => {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.key !== key) : current))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedCustomer) {
      setFormError('Customer is required.')
      return
    }

    if (!invoiceDate) {
      setFormError('Invoice date is required.')
      return
    }

    if (lines.length === 0 || lines.some((line) => !line.item)) {
      setFormError('Every invoice line must have an item.')
      return
    }

    if (lines.some((line) => !Number.isInteger(line.quantity) || line.quantity <= 0)) {
      setFormError('Every invoice line quantity must be greater than 0.')
      return
    }

    const payload: InvoicePayload = {
      customer_id: selectedCustomer.id,
      invoice_date: invoiceDate,
      items: lines.map((line) => ({
        item_id: line.item!.id,
        quantity: line.quantity,
      })),
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const createdInvoice = await createInvoice(payload)
      const refreshedInvoices = await getInvoices()
      setInvoices(refreshedInvoices)
      setInvoiceState('success')
      resetForm()
      navigateTo(`/invoices/${createdInvoice.id}`)
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Failed to create invoice.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section style={{ display: 'grid', gap: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.9fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
            display: 'grid',
            gap: '20px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Create Invoice</h2>
            <p style={{ margin: '8px 0 0', color: '#475569' }}>
              Select a customer, add line items, and let the backend finalize totals.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) minmax(220px, 0.8fr)',
              gap: '16px',
            }}
          >
            <EntityAutocomplete
              label="Customer"
              placeholder="Search customers by name"
              selectedOption={selectedCustomer}
              onSelect={(option) => setSelectedCustomer(option as CustomerOption)}
              onClear={() => setSelectedCustomer(null)}
              loadOptions={customerLoader}
            />

            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>Invoice Date</span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                }}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Line Items</h3>
                <p style={{ margin: '8px 0 0', color: '#475569' }}>
                  Item prices shown here are previews. The backend stores immutable snapshots.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLines((current) => [...current, createEmptyLine()])}
                style={{
                  border: '1px solid #bae6fd',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  color: '#075985',
                  fontWeight: 600,
                }}
              >
                Add Line
              </button>
            </div>

            {lines.map((line, index) => (
              <InvoiceLineEditor
                key={line.key}
                line={line}
                index={index}
                onItemSelect={handleLineItemSelect}
                onItemClear={handleLineItemClear}
                onQuantityChange={handleLineQuantityChange}
                onRemove={handleRemoveLine}
                loadItems={itemLoader}
              />
            ))}
          </div>

          <div
            style={{
              borderRadius: '18px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              padding: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Total Quantity</div>
              <div style={{ marginTop: '6px', fontSize: '1.3rem', fontWeight: 700 }}>
                {totals.totalQuantity}
              </div>
            </div>
            <div>
              <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Subtotal</div>
              <div style={{ marginTop: '6px', fontSize: '1.3rem', fontWeight: 700 }}>
                {formatMoney(totals.subtotal)}
              </div>
            </div>
            <div>
              <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Tax</div>
              <div style={{ marginTop: '6px', fontSize: '1.3rem', fontWeight: 700 }}>
                {formatMoney(totals.taxAmount)} ({formatPercent(TAX_RATE)})
              </div>
            </div>
            <div>
              <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Total</div>
              <div style={{ marginTop: '6px', fontSize: '1.3rem', fontWeight: 700 }}>
                {formatMoney(totals.total)}
              </div>
            </div>
          </div>

          {formError && <p style={{ margin: 0, color: '#b91c1c' }}>{formError}</p>}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                border: 'none',
                borderRadius: '12px',
                padding: '12px 18px',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Creating...' : 'Create Invoice'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '12px 18px',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </form>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
            display: 'grid',
            gap: '16px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Recent Invoices</h2>
            <p style={{ margin: '8px 0 0', color: '#475569' }}>
              Open invoice details to verify stored snapshots and totals.
            </p>
          </div>

          {invoiceState === 'loading' && <p style={{ margin: 0 }}>Loading invoices...</p>}
          {invoiceState === 'error' && (
            <p style={{ margin: 0, color: '#b91c1c' }}>{invoiceError ?? 'Failed to load invoices.'}</p>
          )}
          {invoiceState === 'success' && invoices.length === 0 && (
            <div
              style={{
                border: '1px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '18px',
                color: '#475569',
              }}
            >
              No invoices yet.
            </div>
          )}
          {invoiceState === 'success' &&
            invoices.map((invoice) => (
              <a
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                onClick={(event) => {
                  event.preventDefault()
                  navigateTo(`/invoices/${invoice.id}`)
                }}
                style={{
                  textDecoration: 'none',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'grid',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <strong>{invoice.invoice_number}</strong>
                  <span style={{ color: '#475569' }}>{formatDate(invoice.invoice_date)}</span>
                </div>
                <div style={{ color: '#475569' }}>Total {formatMoney(invoice.total)}</div>
                <div style={{ color: '#475569', fontSize: '0.9rem' }}>
                  Updated {formatDateTime(invoice.updated_at)}
                </div>
              </a>
            ))}
        </div>
      </div>
    </section>
  )
}

export default Invoices
