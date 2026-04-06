import { useDeferredValue, useEffect, useState } from 'react'

type Option = {
  id: number
  label: string
  description?: string | null
}

type EntityAutocompleteProps = {
  label: string
  placeholder: string
  selectedOption: Option | null
  onSelect: (option: Option) => void
  onClear?: () => void
  loadOptions: (search: string) => Promise<Option[]>
  disabled?: boolean
}

function EntityAutocomplete({
  label,
  placeholder,
  selectedOption,
  onSelect,
  onClear,
  loadOptions,
  disabled = false,
}: EntityAutocompleteProps) {
  const [query, setQuery] = useState(selectedOption?.label ?? '')
  const deferredQuery = useDeferredValue(query)
  const [options, setOptions] = useState<Option[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setQuery(selectedOption?.label ?? '')
  }, [selectedOption?.id, selectedOption?.label])

  useEffect(() => {
    if (disabled) {
      setOptions([])
      setOpen(false)
      setLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const nextOptions = await loadOptions(deferredQuery)
        if (!cancelled) {
          setOptions(nextOptions)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : `Failed to load ${label}.`)
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
  }, [deferredQuery, disabled, label, loadOptions])

  return (
    <label style={{ display: 'grid', gap: '8px', position: 'relative' }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150)
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            if (!event.target.value.trim()) {
              onClear?.()
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
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
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '14px',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
              maxHeight: '240px',
              overflowY: 'auto',
              zIndex: 30,
            }}
          >
            {loading && <div style={{ padding: '12px 14px', color: '#475569' }}>Loading...</div>}
            {!loading && error && (
              <div style={{ padding: '12px 14px', color: '#b91c1c' }}>{error}</div>
            )}
            {!loading && !error && options.length === 0 && (
              <div style={{ padding: '12px 14px', color: '#475569' }}>No matches found.</div>
            )}
            {!loading &&
              !error &&
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    onSelect(option)
                    setQuery(option.label)
                    setOpen(false)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '12px 14px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{option.label}</div>
                  {option.description && (
                    <div style={{ marginTop: '4px', color: '#475569', fontSize: '0.9rem' }}>
                      {option.description}
                    </div>
                  )}
                </button>
              ))}
          </div>
        )}
      </div>
    </label>
  )
}

export type { Option as AutocompleteOption }
export default EntityAutocomplete
