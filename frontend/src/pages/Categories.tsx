import { useEffect, useState } from 'react'

import CategoryTreePicker from '../components/CategoryTreePicker'
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryTree,
  updateCategory,
  type CategoryListItem,
  type CategoryPayload,
  type CategoryTreeNode,
} from '../api'
import { formatDateTime } from '../utils'

type LoadState = 'loading' | 'success' | 'error'

type FormState = {
  name: string
  parentId: number | null
}

const emptyFormState: FormState = {
  name: '',
  parentId: null,
}

function renderTree(nodes: CategoryTreeNode[], onEdit: (category: CategoryTreeNode) => void) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, paddingLeft: '18px', display: 'grid', gap: '10px' }}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontWeight: 600 }}>{node.name}</span>
              <span style={{ marginLeft: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                {node.is_leaf ? 'Leaf' : 'Branch'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onEdit(node)}
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
          {node.children.length > 0 && renderTree(node.children, onEdit)}
        </li>
      ))}
    </ul>
  )
}

function Categories() {
  const [categories, setCategories] = useState<CategoryListItem[]>([])
  const [tree, setTree] = useState<CategoryTreeNode[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [formState, setFormState] = useState<FormState>(emptyFormState)
  const [editingCategory, setEditingCategory] = useState<CategoryListItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [treeReloadKey, setTreeReloadKey] = useState(0)

  const loadData = async () => {
    setState('loading')
    setError(null)

    try {
      const [categoriesResponse, treeResponse] = await Promise.all([getCategories(), getCategoryTree()])
      setCategories(categoriesResponse)
      setTree(treeResponse)
      setState('success')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load categories.')
      setState('error')
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const resetForm = () => {
    setFormState(emptyFormState)
    setEditingCategory(null)
    setFormError(null)
  }

  const handleEdit = (category: Pick<CategoryListItem, 'id' | 'name' | 'parent_id'>) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      parent_id: category.parent_id,
      created_at: '',
      updated_at: '',
    })
    setFormState({
      name: category.name,
      parentId: category.parent_id,
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

    const payload: CategoryPayload = {
      name: formState.name.trim(),
      parent_id: formState.parentId,
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, payload)
      } else {
        await createCategory(payload)
      }

      resetForm()
      setTreeReloadKey((current) => current + 1)
      await loadData()
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : 'Failed to save category.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (categoryId: number) => {
    setFormError(null)

    try {
      await deleteCategory(categoryId)
      if (editingCategory?.id === categoryId) {
        resetForm()
      }
      setTreeReloadKey((current) => current + 1)
      await loadData()
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error ? deleteError.message : 'Failed to delete category.',
      )
    }
  }

  return (
    <section style={{ display: 'grid', gap: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)',
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
            display: 'grid',
            gap: '24px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Category Tree</h2>
            <p style={{ margin: '8px 0 0', color: '#475569' }}>
              Build nested categories for items such as Sticker → Rectangle → 20x20.
            </p>
          </div>

          {state === 'loading' && <p style={{ margin: 0 }}>Loading categories...</p>}
          {state === 'error' && <p style={{ margin: 0, color: '#b91c1c' }}>{error}</p>}
          {state === 'success' && tree.length === 0 && (
            <div
              style={{
                border: '1px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '24px',
                color: '#475569',
              }}
            >
              No categories created yet.
            </div>
          )}
          {state === 'success' && tree.length > 0 && renderTree(tree, handleEdit)}

          {state === 'success' && categories.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 8px' }}>Name</th>
                    <th style={{ padding: '12px 8px' }}>Parent</th>
                    <th style={{ padding: '12px 8px' }}>Updated</th>
                    <th style={{ padding: '12px 8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => {
                    const parentName =
                      categories.find((candidate) => candidate.id === category.parent_id)?.name ?? 'Root'

                    return (
                      <tr key={category.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 8px', fontWeight: 600 }}>{category.name}</td>
                        <td style={{ padding: '14px 8px', color: '#475569' }}>{parentName}</td>
                        <td style={{ padding: '14px 8px', color: '#475569' }}>
                          {formatDateTime(category.updated_at)}
                        </td>
                        <td style={{ padding: '14px 8px' }}>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleEdit(category)}
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
                            <button
                              type="button"
                              onClick={() => void handleDelete(category.id)}
                              style={{
                                border: 'none',
                                background: 'none',
                                padding: 0,
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
                    )
                  })}
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
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <p style={{ margin: '8px 0 0', color: '#475569' }}>
                {editingCategory
                  ? 'Update the selected category and its parent.'
                  : 'Create a root category or nest it under an existing one.'}
              </p>
            </div>
            {editingCategory && (
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
                placeholder="Rectangle"
                required
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                }}
              />
            </label>

            <CategoryTreePicker
              label="Parent Category"
              selectedCategoryId={formState.parentId}
              onChange={(categoryId) =>
                setFormState((current) => ({ ...current, parentId: categoryId }))
              }
              includeNoneOption
              reloadKey={treeReloadKey}
            />

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
                ? editingCategory
                  ? 'Saving...'
                  : 'Creating...'
                : editingCategory
                  ? 'Save Category'
                  : 'Add Category'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

export default Categories
