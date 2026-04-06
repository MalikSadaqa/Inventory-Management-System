import { useEffect, useState } from 'react'

import { getItem, type ItemDetail as ItemDetailResponse } from '../api'
import { formatDateTime, formatMoney, navigateTo } from '../utils'

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
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <p style={{ margin: 0, color: '#475569' }}>Item detail</p>
          <h2 style={{ margin: '8px 0 0', fontSize: '1.8rem' }}>{item?.name ?? 'Loading item'}</h2>
        </div>
        <a
          href="/items"
          onClick={(event) => {
            event.preventDefault()
            navigateTo('/items')
          }}
          style={{
            alignSelf: 'start',
            textDecoration: 'none',
            color: '#0369a1',
            fontWeight: 600,
          }}
        >
          Back to items
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
          Loading item details...
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
          {error ?? 'Failed to load item.'}
        </div>
      )}

      {state === 'success' && item && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
          }}
        >
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
              <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>{item.name}</dd>
            </div>
            <div>
              <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Category</dt>
              <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>{item.category.name}</dd>
            </div>
            <div>
              <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Category Path</dt>
              <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>{item.category_path.join(' / ')}</dd>
            </div>
            <div>
              <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Price</dt>
              <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>{formatMoney(item.price)}</dd>
            </div>
            <div>
              <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Cost</dt>
              <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>{formatMoney(item.cost)}</dd>
            </div>
            <div>
              <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Created</dt>
              <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>{formatDateTime(item.created_at)}</dd>
            </div>
            <div>
              <dt style={{ color: '#475569', fontSize: '0.9rem' }}>Updated</dt>
              <dd style={{ margin: '8px 0 0', fontWeight: 600 }}>{formatDateTime(item.updated_at)}</dd>
            </div>
          </dl>

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Details</h3>
            <p style={{ margin: '10px 0 0', color: '#475569', whiteSpace: 'pre-wrap' }}>
              {item.details || 'No additional details provided.'}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

export default ItemDetail
