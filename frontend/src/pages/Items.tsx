import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import CategoryTreePicker from '../components/CategoryTreePicker'
import CustomerTagPicker from '../components/CustomerTagPicker'
import HelpTooltip from '../components/HelpTooltip'
import {
  createItem,
  deleteItem,
  getCategoryTree,
  getCustomers,
  getItem,
  getItems,
  updateItem,
  type CategoryTreeNode,
  type CustomerListItem,
  type ItemListItem,
  type ItemPayload,
} from '../api'
import { formatDateTime, formatMoney, navigateTo } from '../utils'

type LoadState = 'loading' | 'success' | 'error'

type FormState = {
  name: string
  price: string
  cost: string
  categoryId: number | null
  details: string
  taggedCustomers: CustomerListItem[]
}

const emptyFormState: FormState = {
  name: '',
  price: '',
  cost: '',
  categoryId: null,
  details: '',
  taggedCustomers: [],
}

function flattenLeaves(nodes: CategoryTreeNode[]): Array<{ id: number; label: string }> {
  return nodes.flatMap((node) => {
    const ownLabel = node.is_leaf ? [{ id: node.id, label: node.name }] : []
    const childLabels = flattenLeaves(node.children).map((child) => ({
      ...child,
      label: `${node.name} / ${child.label}`,
    }))
    return [...ownLabel, ...childLabels]
  })
}

function Items() {
  const [items, setItems] = useState<ItemListItem[]>([])
  const [tree, setTree] = useState<CategoryTreeNode[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [searchInput, setSearchInput] = useState('')
  const deferredSearch = useDeferredValue(searchInput)
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formState, setFormState] = useState<FormState>(emptyFormState)
  const [editingItem, setEditingItem] = useState<ItemListItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [treeReloadKey, setTreeReloadKey] = useState(0)

  const leafOptions = useMemo(() => flattenLeaves(tree), [tree])

  const loadTree = async () => {
    try {
      const response = await getCategoryTree()
      setTree(response)
    } catch {
      setTree([])
    }
  }

  const loadItems = async (search = deferredSearch, selectedCategoryId = categoryFilter) => {
    setState('loading')
    setError(null)

    try {
      const response = await getItems(search, selectedCategoryId)
      setItems(response)
      setState('success')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load items.')
      setState('error')
    }
  }

  useEffect(() => {
    void loadItems()
  }, [deferredSearch, categoryFilter])

  useEffect(() => {
    void loadTree()
  }, [treeReloadKey])

  const resetForm = () => {
    setFormState(emptyFormState)
    setEditingItem(null)
    setFormError(null)
    setLoadingEdit(false)
  }

  const handleEdit = async (item: ItemListItem) => {
    setEditingItem(item)
    setLoadingEdit(true)
    setFormError(null)

    try {
      const detail = await getItem(item.id)
      setFormState({
        name: detail.name,
        price: detail.price,
        cost: detail.cost,
        categoryId: detail.category.id,
        details: detail.details ?? '',
        taggedCustomers: detail.tagged_customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: null,
          created_at: '',
          updated_at: '',
        })),
      })
    } catch (loadError) {
      setFormError(loadError instanceof Error ? loadError.message : 'Failed to load item for editing.')
      setEditingItem(null)
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formState.name.trim()) {
      setFormError('Name is required.')
      return
    }

    if (!formState.categoryId) {
      setFormError('A leaf category is required.')
      return
    }

    if (formState.price === '' || Number(formState.price) < 0) {
      setFormError('Price must be 0 or greater.')
      return
    }

    if (formState.cost === '' || Number(formState.cost) < 0) {
      setFormError('Cost must be 0 or greater.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    const payload: ItemPayload = {
      name: formState.name.trim(),
      price: formState.price,
      cost: formState.cost,
      category_id: formState.categoryId,
      details: formState.details.trim() || null,
      tagged_customer_ids: formState.taggedCustomers.map((customer) => customer.id),
    }

    try {
      if (editingItem) {
        await updateItem(editingItem.id, payload)
      } else {
        await createItem(payload)
      }

      resetForm()
      await loadItems()
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Failed to save item.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item: ItemListItem) => {
    const confirmed = window.confirm(
      `Delete "${item.name}"? Items used in invoices cannot be deleted.`,
    )
    if (!confirmed) {
      return
    }

    setFormError(null)

    try {
      await deleteItem(item.id)
      if (editingItem?.id === item.id) {
        resetForm()
      }
      await loadItems()
    } catch (deleteError) {
      setFormError(deleteError instanceof Error ? deleteError.message : 'Failed to delete item.')
    }
  }

  const loadCustomersForTags = async (search: string) => {
    return getCustomers(search)
  }

  return (
    <section style={{ display: 'grid', gap: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        <div
          style={{
            minWidth: 0,
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
            display: 'grid',
            gap: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '16px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Items</h2>
              <HelpTooltip content="Search items, filter by leaf category, and maintain pricing data." />
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by item name"
                style={filterFieldStyle}
              />
              <select
                value={categoryFilter ?? ''}
                onChange={(event) => setCategoryFilter(event.target.value ? Number(event.target.value) : null)}
                style={filterFieldStyle}
              >
                <option value="">All categories</option>
                {leafOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {state === 'loading' && <p style={{ margin: 0 }}>Loading items...</p>}
          {state === 'error' && <p style={{ margin: 0, color: '#b91c1c' }}>{error}</p>}
          {state === 'success' && items.length === 0 && (
            <div style={emptyStateStyle}>No items found.</div>
          )}

          {state === 'success' && items.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={headerCellStyle}>Name</th>
                    <th style={headerCellStyle}>Price</th>
                    <th style={headerCellStyle}>Cost</th>
                    <th style={headerCellStyle}>Updated</th>
                    <th style={headerCellStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={bodyCellStyle}>
                        <a
                          href={`/items/${item.id}`}
                          onClick={(event) => {
                            event.preventDefault()
                            navigateTo(`/items/${item.id}`)
                          }}
                          style={primaryLinkStyle}
                        >
                          {item.name}
                        </a>
                      </td>
                      <td style={bodyCellStyle}>{formatMoney(item.price)}</td>
                      <td style={bodyCellStyle}>{formatMoney(item.cost)}</td>
                      <td style={{ ...bodyCellStyle, color: '#475569' }}>
                        {formatDateTime(item.updated_at)}
                      </td>
                      <td style={bodyCellStyle}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <a
                            href={`/items/${item.id}`}
                            onClick={(event) => {
                              event.preventDefault()
                              navigateTo(`/items/${item.id}`)
                            }}
                            style={actionLinkStyle}
                          >
                            View
                          </a>
                          <button type="button" onClick={() => void handleEdit(item)} style={plainButtonStyle}>
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item)}
                            style={{ ...plainButtonStyle, color: '#b91c1c' }}
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
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
            overflow: 'hidden',
            display: 'grid',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                {editingItem ? 'Edit Item' : 'Add Item'}
              </h2>
              <HelpTooltip content="Keep catalog pricing current and attach each item to a leaf category with optional customer tags." />
            </div>
            {editingItem && (
              <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
                Cancel
              </button>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: 'grid', gap: '16px', width: '100%', minWidth: 0 }}
          >
            <label style={{ display: 'grid', gap: '8px', minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>Name</span>
              <input
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="20x20 Matte Sticker"
                required
                style={fieldStyle}
              />
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '16px',
                width: '100%',
                minWidth: 0,
              }}
            >
              <label style={{ display: 'grid', gap: '8px', minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>Price</span>
                <input
                  value={formState.price}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, price: event.target.value }))
                  }
                  min="0"
                  step="0.01"
                  type="number"
                  placeholder="10.00"
                  required
                  style={fieldStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: '8px', minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>Cost</span>
                <input
                  value={formState.cost}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, cost: event.target.value }))
                  }
                  min="0"
                  step="0.01"
                  type="number"
                  placeholder="6.00"
                  required
                  style={fieldStyle}
                />
              </label>
            </div>

            <CategoryTreePicker
              label="Leaf Category"
              selectedCategoryId={formState.categoryId}
              onChange={(categoryId) =>
                setFormState((current) => ({ ...current, categoryId }))
              }
              leafOnly
              reloadKey={treeReloadKey}
            />

            <CustomerTagPicker
              selectedCustomers={formState.taggedCustomers}
              onChange={(taggedCustomers) => setFormState((current) => ({ ...current, taggedCustomers }))}
              loadCustomers={loadCustomersForTags}
              disabled={loadingEdit || submitting}
            />

            <label style={{ display: 'grid', gap: '8px', minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>Details</span>
              <textarea
                value={formState.details}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, details: event.target.value }))
                }
                placeholder="Optional production notes"
                rows={4}
                style={{
                  ...fieldStyle,
                  resize: 'vertical',
                }}
              />
            </label>

            {formError && <p style={{ margin: 0, color: '#b91c1c' }}>{formError}</p>}

            <button type="submit" disabled={submitting || loadingEdit} style={primaryButtonStyle}>
              {loadingEdit
                ? 'Loading item...'
                : submitting
                  ? editingItem
                    ? 'Saving...'
                    : 'Creating...'
                  : editingItem
                    ? 'Save Item'
                    : 'Add Item'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

const fieldStyle = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box' as const,
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  fontSize: '0.95rem',
}

const filterFieldStyle = {
  minWidth: '220px',
  maxWidth: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  fontSize: '0.95rem',
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

const primaryLinkStyle = {
  color: '#0f172a',
  textDecoration: 'none',
  fontWeight: 600,
}

const actionLinkStyle = {
  color: '#0f766e',
  fontWeight: 600,
  textDecoration: 'none',
}

const plainButtonStyle = {
  border: 'none',
  background: 'none',
  padding: 0,
  color: '#0369a1',
  cursor: 'pointer',
  fontWeight: 600,
}

const secondaryButtonStyle = {
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  borderRadius: '10px',
  padding: '10px 12px',
  cursor: 'pointer',
}

const primaryButtonStyle = {
  border: 'none',
  borderRadius: '12px',
  padding: '12px 16px',
  backgroundColor: '#0f766e',
  color: '#ffffff',
  fontWeight: 700,
  cursor: 'pointer',
}

export default Items
