import { memo, type CSSProperties } from 'react'

type PaginationControlsProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

const PaginationControls = memo(function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1

  return (
    <div style={paginationBarStyle}>
      <div style={summaryStyle}>
        Showing {firstShown}-{Math.min(page * pageSize, total)} of {total}
      </div>
      <div style={buttonRowStyle}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{
            ...secondaryButtonStyle,
            opacity: page <= 1 ? 0.55 : 1,
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
          }}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{
            ...primaryButtonStyle,
            opacity: page >= totalPages ? 0.55 : 1,
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          Next
        </button>
      </div>
    </div>
  )
})

const paginationBarStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'center',
  flexWrap: 'wrap',
  marginTop: '16px',
  borderTop: '1px solid #e2e8f0',
  paddingTop: '16px',
}

const summaryStyle: CSSProperties = {
  color: '#475569',
  fontSize: '0.95rem',
}

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
}

const primaryButtonStyle: CSSProperties = {
  border: '1px solid #0f766e',
  borderRadius: '12px',
  padding: '10px 14px',
  backgroundColor: '#0f766e',
  color: '#ffffff',
  fontWeight: 700,
  cursor: 'pointer',
}

const secondaryButtonStyle: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: '12px',
  padding: '10px 14px',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontWeight: 600,
  cursor: 'pointer',
}

export default PaginationControls
