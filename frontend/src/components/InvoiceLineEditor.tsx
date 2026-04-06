import EntityAutocomplete, { type AutocompleteOption } from './EntityAutocomplete'
import { formatMoney } from '../utils'

type InvoiceItemOption = AutocompleteOption & {
  price: string
  categoryPath?: string | null
}

type InvoiceLineDraft = {
  key: string
  item: InvoiceItemOption | null
  quantity: number
}

type InvoiceLineEditorProps = {
  line: InvoiceLineDraft
  index: number
  onItemSelect: (key: string, item: InvoiceItemOption) => void
  onItemClear: (key: string) => void
  onQuantityChange: (key: string, quantity: number) => void
  onRemove: (key: string) => void
  loadItems: (search: string) => Promise<InvoiceItemOption[]>
}

function InvoiceLineEditor({
  line,
  index,
  onItemSelect,
  onItemClear,
  onQuantityChange,
  onRemove,
  loadItems,
}: InvoiceLineEditorProps) {
  const unitPrice = Number(line.item?.price ?? 0)
  const lineSubtotal = unitPrice * line.quantity

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '18px',
        display: 'grid',
        gap: '14px',
        backgroundColor: '#f8fafc',
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
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Line {index + 1}</h3>
          <p style={{ margin: '6px 0 0', color: '#475569' }}>
            Search the catalog, then set the invoice quantity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(line.key)}
          style={{
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '10px 12px',
            backgroundColor: '#ffffff',
            color: '#b91c1c',
            cursor: 'pointer',
          }}
        >
          Remove
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2.2fr) minmax(140px, 0.8fr) minmax(180px, 0.9fr)',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        <EntityAutocomplete
          label="Item"
          placeholder="Search items by name"
          selectedOption={line.item}
          onSelect={(option) => onItemSelect(line.key, option as InvoiceItemOption)}
          onClear={() => onItemClear(line.key)}
          loadOptions={loadItems}
        />

        <label style={{ display: 'grid', gap: '8px' }}>
          <span style={{ fontWeight: 600 }}>Quantity</span>
          <input
            type="number"
            min={1}
            value={line.quantity}
            onChange={(event) => onQuantityChange(line.key, Number(event.target.value) || 0)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              fontSize: '0.95rem',
            }}
          />
        </label>

        <div style={{ display: 'grid', gap: '8px' }}>
          <span style={{ fontWeight: 600 }}>Line Subtotal</span>
          <div
            style={{
              minHeight: '46px',
              display: 'flex',
              alignItems: 'center',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontWeight: 600,
            }}
          >
            {formatMoney(lineSubtotal)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          color: '#475569',
          paddingTop: '2px',
        }}
      >
        <div>
          <div style={{ fontSize: '0.85rem' }}>Item</div>
          <div style={{ marginTop: '6px', color: '#0f172a', fontWeight: 600 }}>
            {line.item?.label ?? 'Not selected'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem' }}>Unit Price</div>
          <div style={{ marginTop: '6px', color: '#0f172a', fontWeight: 600 }}>
            {line.item ? formatMoney(line.item.price) : formatMoney(0)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem' }}>Category</div>
          <div style={{ marginTop: '6px', color: '#0f172a', fontWeight: 600 }}>
            {line.item?.categoryPath ?? 'Uncategorized'}
          </div>
        </div>
      </div>
    </div>
  )
}

export type { InvoiceItemOption, InvoiceLineDraft }
export default InvoiceLineEditor
