import { useEffect, useState } from 'react'

import { getCategory, type CategoryDetail as CategoryDetailResponse, type CategoryTreeNode } from '../api'
import { formatDateTime, navigateTo } from '../utils'

type LoadState = 'loading' | 'success' | 'error'

function renderChildren(nodes: CategoryTreeNode[]) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, paddingLeft: '18px', display: 'grid', gap: '10px' }}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href={`/categories/${node.id}`}
              onClick={(event) => {
                event.preventDefault()
                navigateTo(`/categories/${node.id}`)
              }}
              style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 600 }}
            >
              {node.name}
            </a>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
              {node.is_leaf ? 'Leaf' : 'Branch'}
            </span>
          </div>
          {node.children.length > 0 && renderChildren(node.children)}
        </li>
      ))}
    </ul>
  )
}

function CategoryDetail() {
  const pathSegments = window.location.pathname.split('/').filter(Boolean)
  const categoryId = pathSegments[1]
  const [category, setCategory] = useState<CategoryDetailResponse | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const parsedId = Number(categoryId)

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setError('Invalid category id.')
      setState('error')
      return
    }

    let cancelled = false

    const loadCategory = async () => {
      setState('loading')
      setError(null)

      try {
        const response = await getCategory(parsedId)
        if (!cancelled) {
          setCategory(response)
          setState('success')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load category.')
          setState('error')
        }
      }
    }

    void loadCategory()

    return () => {
      cancelled = true
    }
  }, [categoryId])

  return (
    <section style={{ display: 'grid', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, color: '#475569' }}>Category detail</p>
          <h2 style={{ margin: '8px 0 0', fontSize: '1.8rem' }}>
            {category?.name ?? 'Loading category'}
          </h2>
        </div>
        <a
          href="/categories"
          onClick={(event) => {
            event.preventDefault()
            navigateTo('/categories')
          }}
          style={{ alignSelf: 'start', textDecoration: 'none', color: '#0369a1', fontWeight: 600 }}
        >
          Back to categories
        </a>
      </div>

      {state === 'loading' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)' }}>
          Loading category details...
        </div>
      )}

      {state === 'error' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)', color: '#b91c1c' }}>
          {error ?? 'Failed to load category.'}
        </div>
      )}

      {state === 'success' && category && (
        <>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)' }}>
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
                <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>{category.name}</dd>
              </div>
              <div>
                <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Parent</dt>
                <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>
                  {category.parent ? category.parent.name : 'Root category'}
                </dd>
              </div>
              <div>
                <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Full Path</dt>
                <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>{category.path.join(' / ')}</dd>
              </div>
              <div>
                <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Type</dt>
                <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>
                  {category.is_leaf ? 'Leaf category' : 'Branch category'}
                </dd>
              </div>
              <div>
                <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Created</dt>
                <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>{formatDateTime(category.created_at)}</dd>
              </div>
              <div>
                <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Updated</dt>
                <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>{formatDateTime(category.updated_at)}</dd>
              </div>
            </dl>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Children</h3>
            <p style={{ margin: '8px 0 0', color: '#475569' }}>
              Nested categories directly under this category.
            </p>

            {category.children_tree.length === 0 ? (
              <div style={{ marginTop: '20px', border: '1px dashed #cbd5e1', borderRadius: '16px', padding: '24px', color: '#475569' }}>
                No child categories.
              </div>
            ) : (
              <div style={{ marginTop: '20px' }}>{renderChildren(category.children_tree)}</div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default CategoryDetail
