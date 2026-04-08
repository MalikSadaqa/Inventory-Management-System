import { memo, useState, type CSSProperties, type ReactNode } from 'react'

type HelpTooltipProps = {
  content: ReactNode
}

const wrapperStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
}

const HelpTooltip = memo(function HelpTooltip({ content }: HelpTooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <span
      style={wrapperStyle}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Help"
        style={triggerStyle}
      >
        i
      </button>
      {open && <span style={tooltipStyle}>{content}</span>}
    </span>
  )
})

const triggerStyle: CSSProperties = {
  width: '22px',
  height: '22px',
  borderRadius: '999px',
  border: '1px solid #bfdbfe',
  backgroundColor: '#eff6ff',
  color: '#0369a1',
  fontSize: '0.82rem',
  fontWeight: 700,
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'help',
  padding: 0,
}

const tooltipStyle: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 10px)',
  left: 0,
  minWidth: '220px',
  maxWidth: '320px',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid #dbeafe',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  boxShadow: '0 16px 36px rgba(15, 23, 42, 0.12)',
  fontSize: '0.9rem',
  lineHeight: 1.45,
  zIndex: 40,
}

export default HelpTooltip
