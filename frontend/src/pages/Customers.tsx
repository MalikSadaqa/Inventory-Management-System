import { useDeferredValue, useEffect, useState } from 'react'

import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
  type CustomerListItem,
  type CustomerPayload,
} from '../api'
import { formatDateTime, navigateTo } from '../utils'

type LoadState = 'idle' | 'loading' | 'success' | 'error'

type FormState = {
  name: string
  email: string
  phone: string
}

const emptyFormState: FormState = {
  name: '',
  email: '',
  phone: '',
}

function Customers() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [searchInput, setSearchInput] = useState('')
  const deferredSearch = useDeferredValue(searchInput)
  const [error, setError] = useState<string | null>(null)
  const [formState, setFormState] = useState<FormState>(emptyFormState)
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadCustomers = async () => {
      setLoadState('loading')
      setError(null)

      try {
        const response = await getCustomers(deferredSearch)
        if (!cancelled) {
          setCustomers(response)
          setLoadState('success')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load customers.')
          setLoadState('error')
        }
      }
    }

    void loadCustomers()

    return () => {
      cancelled = true
    }
  }, [deferredSearch])

  const resetForm = () => {
    setFormState(emptyFormState)
    setEditingCustomer(null)
    setFormError(null)
  }

  const handleEdit = (customer: CustomerListItem) => {
    setEditingCustomer(customer)
    setFormState({
      name: customer.name,
      email: customer.email ?? '',
      phone: customer.phone ?? '',
    })
    setFormError(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formState.name.trim()) {
      setFormError('Name is required.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    const payload: CustomerPayload = {
      name: formState.name.trim(),
      email: formState.email.trim() || null,
      phone: formState.phone.trim() || null,
    }

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload)
      } else {
        await createCustomer(payload)
      }

      resetForm()
      const refreshedCustomers = await getCustomers(deferredSearch)
      setCustomers(refreshedCustomers)
      setLoadState('success')
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : 'Failed to save customer.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (customer: CustomerListItem) => {
    const confirmed = window.confirm(
      `Delete "${customer.name}"? Customers referenced by invoices cannot be deleted.`,
    )
    if (!confirmed) {
      return
    }

    setFormError(null)

    try {
      await deleteCustomer(customer.id)
      if (editingCustomer?.id === customer.id) {
        resetForm()
      }

      const refreshedCustomers = await getCustomers(deferredSearch)
      setCustomers(refreshedCustomers)
      setLoadState('success')
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error ? deleteError.message : 'Failed to delete customer.',
      )
    }
  }

  return (
    <section
      style={{
        display: 'grid',
        gap: '24px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
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
              display: 'flex',
              justifyContent: 'space-between',
              gap: '16px',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Customer Directory</h2>
              <p style={{ margin: '8px 0 0', color: '#475569' }}>
                Search customers, open details, or edit records.
              </p>
            </div>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name"
              style={{
                width: '280px',
                maxWidth: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
              }}
            />
          </div>

          {loadState === 'loading' && <p style={{ margin: 0 }}>Loading customers...</p>}

          {loadState === 'error' && (
            <p style={{ margin: 0, color: '#b91c1c' }}>{error ?? 'Failed to load customers.'}</p>
          )}

          {loadState === 'success' && customers.length === 0 && (
            <div
              style={{
                border: '1px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '24px',
                color: '#475569',
              }}
            >
              No customers found.
            </div>
          )}

          {loadState === 'success' && customers.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 8px' }}>Name</th>
                    <th style={{ padding: '12px 8px' }}>Email</th>
                    <th style={{ padding: '12px 8px' }}>Phone</th>
                    <th style={{ padding: '12px 8px' }}>Updated</th>
                    <th style={{ padding: '12px 8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 8px' }}>
                        <a
                          href={`/customers/${customer.id}`}
                          onClick={(event) => {
                            event.preventDefault()
                            navigateTo(`/customers/${customer.id}`)
                          }}
                          style={{
                            color: '#0f172a',
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          {customer.name}
                        </a>
                      </td>
                      <td style={{ padding: '14px 8px', color: '#475569' }}>
                        {customer.email || 'No email'}
                      </td>
                      <td style={{ padding: '14px 8px', color: '#475569' }}>
                        {customer.phone || 'No phone'}
                      </td>
                      <td style={{ padding: '14px 8px', color: '#475569' }}>
                        {formatDateTime(customer.updated_at)}
                      </td>
                      <td style={{ padding: '14px 8px' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <a
                            href={`/customers/${customer.id}`}
                            onClick={(event) => {
                              event.preventDefault()
                              navigateTo(`/customers/${customer.id}`)
                            }}
                            style={{ color: '#0f766e', fontWeight: 600, textDecoration: 'none' }}
                          >
                            View
                          </a>
                          <button
                            type="button"
                            onClick={() => handleEdit(customer)}
                            style={{
                              border: 'none',
                              padding: 0,
                              background: 'none',
                              color: '#0369a1',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(customer)}
                            style={{
                              border: 'none',
                              padding: 0,
                              background: 'none',
                              color: '#b91c1c',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <p style={{ margin: '8px 0 0', color: '#475569' }}>
                {editingCustomer
                  ? 'Update the selected customer record.'
                  : 'Create a customer record for invoices and orders.'}
              </p>
            </div>
            {editingCustomer && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>Name</span>
              <input
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Acme Corp"
                required
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                }}
              />
            </label>

            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>Email</span>
              <input
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="acme@example.com"
                type="email"
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                }}
              />
            </label>

            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>Phone</span>
              <input
                value={formState.phone}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="+962 7 9000 0000"
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                }}
              />
            </label>

            {formError && <p style={{ margin: 0, color: '#b91c1c' }}>{formError}</p>}

            <button
              type="submit"
              disabled={submitting}
              style={{
                border: 'none',
                borderRadius: '12px',
                padding: '12px 16px',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {submitting
                ? editingCustomer
                  ? 'Saving...'
                  : 'Creating...'
                : editingCustomer
                  ? 'Save Changes'
                  : 'Add Customer'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

export default Customers
