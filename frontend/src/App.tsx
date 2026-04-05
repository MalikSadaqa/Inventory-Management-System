import { useEffect, useState } from 'react'

import { getHealth, type HealthResponse } from './api'

type LoadState = 'loading' | 'success' | 'error'

function App() {
  const [state, setState] = useState<LoadState>('loading')
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const response = await getHealth()
        setHealth(response)
        setState('success')
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to reach backend health endpoint.',
        )
        setState('error')
      }
    }

    void loadHealth()
  }, [])

  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        display: 'grid',
        placeItems: 'center',
        background:
          'linear-gradient(135deg, rgba(238,242,255,1) 0%, rgba(248,250,252,1) 55%, rgba(226,232,240,1) 100%)',
        color: '#0f172a',
        fontFamily: 'system-ui, sans-serif',
        padding: '24px',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '560px',
          borderRadius: '20px',
          backgroundColor: '#ffffff',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.12)',
          padding: '32px',
        }}
      >
        <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
          Inventory Management System
        </p>
        <h1 style={{ margin: '8px 0 24px', fontSize: '2rem' }}>Milestone 0</h1>

        {state === 'loading' && (
          <p style={{ margin: 0, fontSize: '1rem' }}>Checking backend health...</p>
        )}

        {state === 'error' && (
          <div>
            <p style={{ margin: '0 0 12px', fontSize: '1rem', color: '#b91c1c' }}>
              Backend check failed
            </p>
            <pre
              style={{
                margin: 0,
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                overflowX: 'auto',
              }}
            >
              {JSON.stringify({ error }, null, 2)}
            </pre>
          </div>
        )}

        {state === 'success' && health && (
          <div>
            <p
              style={{
                margin: '0 0 12px',
                fontSize: '1rem',
                color: health.status === 'ok' ? '#166534' : '#b45309',
              }}
            >
              Backend responded successfully
            </p>
            <pre
              style={{
                margin: 0,
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(health, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
