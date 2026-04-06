import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import CategoryTreePicker from '../components/CategoryTreePicker'
import {
  createItem,
  getCategoryTree,
  getItems,
  updateItem,
  type CategoryTreeNode,
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
}

const emptyFormState: FormState = {
  name: '',
  price: '',
  cost: '',
  categoryId: null,
  details: '',
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
  }

  const handleEdit = (item: ItemListItem) => {
    setEditingItem(item)
    setFormState({
      name: item.name,
      price: item.price,
      cost: item.cost,
      categoryId: item.category_id,
      details: item.details ?? '',
    })
    setFormError(null)
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
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Items</h2>
              <p style={{ margin: '8px 0 0', color: '#475569' }}>
                Search items, filter by leaf category, and maintain pricing data.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by item name"
                style={{
                  width: '240px',
                  maxWidth: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                }}
              />
              <select
                value={categoryFilter ?? ''}
                onChange={(event) => setCategoryFilter(event.target.value ? Number(event.target.value) : null)}
                style={{
                  minWidth: '240px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                }}
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
            <div
              style={{
                border: '1px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '24px',
                color: '#475569',
              }}
            >
              No items found.
            </div>
          )}

          {state === 'success' && items.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 8px' }}>Name</th>
                    <th style={{ padding: '12px 8px' }}>Price</th>
                    <th style={{ padding: '12px 8px' }}>Cost</th>
                    <th style={{ padding: '12px 8px' }}>Updated</th>
                    <th style={{ padding: '12px 8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 8px' }}>
                        <a
                          href={`/items/${item.id}`}
                          onClick={(event) => {
                            event.preventDefault()
                            navigateTo(`/items/${item.id}`)
                          }}
                          style={{
                            color: '#0f172a',
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          {item.name}
                        </a>
                      </td>
                      <td style={{ padding: '14px 8px' }}>{formatMoney(item.price)}</td>
                      <td style={{ padding: '14px 8px' }}>{formatMoney(item.cost)}</td>
                      <td style={{ padding: '14px 8px', color: '#475569' }}>
                        {formatDateTime(item.updated_at)}
                      </td>
                      <td style={{ padding: '14px 8px' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <a
                            href={`/items/${item.id}`}
                            onClick={(event) => {
                              event.preventDefault()
                              navigateTo(`/items/${item.id}`)
                            }}
                            style={{ color: '#0f766e', fontWeight: 600, textDecoration: 'none' }}
                          >
                            View
                          </a>
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            style={{
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              color: '#0369a1',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Edit
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
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                {editingItem ? 'Edit Item' : 'Add Item'}
              </h2>
              <p style={{ margin: '8px 0 0', color: '#475569' }}>
                Items must be attached to a leaf category.
              </p>
            </div>
            {editingItem && (
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

          <form
            onSubmit={handleSubmit}
            style={{ display: 'grid', gap: '16px', marginTop: '20px', width: '100%', minWidth: 0 }}
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

export default Items
