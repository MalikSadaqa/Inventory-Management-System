import { useDeferredValue, useEffect, useState } from 'react'

import type { CustomerListItem } from '../api'

type CustomerTagPickerProps = {
  selectedCustomers: CustomerListItem[]
  onChange: (customers: CustomerListItem[]) => void
  loadCustomers: (search: string) => Promise<CustomerListItem[]>
  disabled?: boolean
}

function CustomerTagPicker({
  selectedCustomers,
  onChange,
  loadCustomers,
  disabled = false,
}: CustomerTagPickerProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [options, setOptions] = useState<CustomerListItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (disabled) {
      setOptions([])
      setOpen(false)
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await loadCustomers(deferredQuery)
        if (!cancelled) {
          setOptions(response)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load customers.')
          setOptions([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [deferredQuery, disabled, loadCustomers])

  const selectedIds = new Set(selectedCustomers.map((customer) => customer.id))
  const availableOptions = options.filter((customer) => !selectedIds.has(customer.id))

  return (
    <div style={{ display: 'grid', gap: '10px', position: 'relative' }}>
      <span style={{ fontWeight: 600 }}>Customer Tags</span>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {selectedCustomers.length === 0 && (
          <span style={{ color: '#64748b', fontSize: '0.92rem' }}>No customer tags selected.</span>
        )}
        {selectedCustomers.map((customer) => (
          <span
            key={customer.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '999px',
              backgroundColor: '#e0f2fe',
              color: '#0c4a6e',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            {customer.name}
            <button
              type="button"
              onClick={() => onChange(selectedCustomers.filter((entry) => entry.id !== customer.id))}
              disabled={disabled}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                color: '#075985',
                cursor: disabled ? 'default' : 'pointer',
                fontWeight: 700,
              }}
            >
              Remove
            </button>
          </span>
        ))}
      </div>

      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150)
          }}
          disabled={disabled}
          placeholder="Search customers to tag"
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            fontSize: '0.95rem',
            backgroundColor: disabled ? '#f8fafc' : '#ffffff',
          }}
        />

        {open && !disabled && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 30,
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '14px',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
              maxHeight: '240px',
              overflowY: 'auto',
            }}
          >
            {loading && <div style={{ padding: '12px 14px', color: '#475569' }}>Loading...</div>}
            {!loading && error && <div style={{ padding: '12px 14px', color: '#b91c1c' }}>{error}</div>}
            {!loading && !error && availableOptions.length === 0 && (
              <div style={{ padding: '12px 14px', color: '#475569' }}>No additional customers found.</div>
            )}
            {!loading &&
              !error &&
              availableOptions.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    onChange([...selectedCustomers, customer])
                    setQuery('')
                    setOpen(true)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    background: 'none',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '12px 14px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{customer.name}</div>
                  <div style={{ marginTop: '4px', color: '#475569', fontSize: '0.9rem' }}>
                    {customer.email || 'No email'}
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomerTagPicker
