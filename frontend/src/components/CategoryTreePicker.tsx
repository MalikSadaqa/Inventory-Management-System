import { useEffect, useMemo, useState } from 'react'

import { getCategoryTree, type CategoryTreeNode } from '../api'

type CategoryTreePickerProps = {
  label?: string
  selectedCategoryId: number | null
  onChange: (categoryId: number | null) => void
  leafOnly?: boolean
  includeNoneOption?: boolean
  disabled?: boolean
  reloadKey?: number
}

type LoadState = 'loading' | 'success' | 'error'

function flattenTree(nodes: CategoryTreeNode[], depth = 0): Array<CategoryTreeNode & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenTree(node.children, depth + 1),
  ])
}

function CategoryTreePicker({
  label = 'Category',
  selectedCategoryId,
  onChange,
  leafOnly = false,
  includeNoneOption = false,
  disabled = false,
  reloadKey = 0,
}: CategoryTreePickerProps) {
  const [tree, setTree] = useState<CategoryTreeNode[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadTree = async () => {
      setState('loading')
      setError(null)

      try {
        const response = await getCategoryTree()
        if (!cancelled) {
          setTree(response)
          setState('success')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load category tree.')
          setState('error')
        }
      }
    }

    void loadTree()

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const options = useMemo(() => flattenTree(tree), [tree])
  const selectedNode = options.find((option) => option.id === selectedCategoryId) ?? null

  return (
    <div style={{ display: 'grid', gap: '8px', minWidth: 0, width: '100%' }}>
      <label style={{ fontWeight: 600 }}>{label}</label>
      <select
        value={selectedCategoryId ?? ''}
        onChange={(event) => {
          const nextValue = event.target.value
          onChange(nextValue ? Number(nextValue) : null)
        }}
        disabled={disabled || state === 'loading'}
        style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          minWidth: 0,
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1px solid #cbd5e1',
          fontSize: '0.95rem',
          backgroundColor: disabled ? '#f8fafc' : '#ffffff',
        }}
      >
        {includeNoneOption && <option value="">No parent</option>}
        {!includeNoneOption && <option value="">Select a category</option>}
        {options.map((option) => {
          const labelPrefix = `${'  '.repeat(option.depth)}${option.depth > 0 ? '↳ ' : ''}`
          const suffix = option.is_leaf ? '' : ' (branch)'

          return (
            <option
              key={option.id}
              value={option.id}
              disabled={leafOnly && !option.is_leaf}
            >
              {`${labelPrefix}${option.name}${suffix}`}
            </option>
          )
        })}
      </select>

      {state === 'loading' && <p style={{ margin: 0, color: '#475569' }}>Loading categories...</p>}
      {state === 'error' && <p style={{ margin: 0, color: '#b91c1c' }}>{error}</p>}
      {state === 'success' && options.length === 0 && (
        <p style={{ margin: 0, color: '#475569' }}>No categories available yet.</p>
      )}
      {leafOnly && selectedNode && !selectedNode.is_leaf && (
        <p style={{ margin: 0, color: '#b91c1c' }}>Only leaf categories can be selected.</p>
      )}
      {leafOnly && state === 'success' && (
        <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
          Branch categories are shown for context and cannot be selected for items.
        </p>
      )}
    </div>
  )
}

export default CategoryTreePicker
