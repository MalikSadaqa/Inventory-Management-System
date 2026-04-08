import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react'

import {
  getCustomers,
  getItems,
  searchInvoiceLines,
  type InvoiceLineSearchParams,
  type InvoiceLineSearchResponse,
  type InvoiceLineSearchRow,
  type InvoiceLineSearchSortField,
  type SortDirection,
} from '../api'
import EntityAutocomplete, { type AutocompleteOption } from '../components/EntityAutocomplete'
import HelpTooltip from '../components/HelpTooltip'
import { formatDate, formatMoney, navigateTo } from '../utils'

type LoadState = 'idle' | 'loading' | 'success' | 'error'

type SearchFilters = {
  itemName: string
  customerName: string
  dateFrom: string
  dateTo: string
}

const DEFAULT_PAGE_SIZE = 25

const INITIAL_FILTERS: SearchFilters = {
  itemName: '',
  customerName: '',
  dateFrom: '',
  dateTo: '',
}

const SEARCH_HELP_CONTENT = (
  <>
    <div>Where did this item appear?</div>
    <div style={{ marginTop: '6px' }}>
      Search invoice line snapshots across invoices and customers with accounting-style filters,
      sortable results, and direct drill-in to the source invoice.
    </div>
  </>
)

const RESULTS_HELP_CONTENT = 'Open any row to inspect the original invoice and its stored line snapshot.'

const SORT_LABELS: Record<InvoiceLineSearchSortField, string> = {
  item_name: 'Item',
  invoice_number: 'Invoice',
  invoice_date: 'Invoice Date',
  customer_name: 'Customer',
  quantity: 'Quantity',
  unit_price: 'Unit Price',
  line_total: 'Line Total',
}

function buildSearchParams(
  filters: SearchFilters,
  page: number,
  sortBy: InvoiceLineSearchSortField,
  sortDirection: SortDirection,
): InvoiceLineSearchParams {
  return {
    item_name: filters.itemName,
    customer_name: filters.customerName,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
    page,
    page_size: DEFAULT_PAGE_SIZE,
    sort_by: sortBy,
    sort_direction: sortDirection,
  }
}

function getSummaryParts(filters: SearchFilters): string[] {
  const parts: string[] = []

  if (filters.itemName.trim()) {
    parts.push(`Item: ${filters.itemName.trim()}`)
  }
  if (filters.customerName.trim()) {
    parts.push(`Customer: ${filters.customerName.trim()}`)
  }
  if (filters.dateFrom) {
    parts.push(`From ${formatDate(filters.dateFrom)}`)
  }
  if (filters.dateTo) {
    parts.push(`To ${formatDate(filters.dateTo)}`)
  }

  return parts
}

function mapAutocompleteOption(entry: { id: number; name: string; email?: string | null }): AutocompleteOption {
  return {
    id: entry.id,
    label: entry.name,
    description: entry.email || null,
  }
}

function InvoiceLineSearch() {
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(INITIAL_FILTERS)

  const loadItemOptions = useCallback(async (search: string) => {
    const response = await getItems(search)
    return response.map((item) => mapAutocompleteOption(item))
  }, [])

  const loadCustomerOptions = useCallback(async (search: string) => {
    const response = await getCustomers(search)
    return response.map((customer) => mapAutocompleteOption(customer))
  }, [])

  const handleApplyFilters = useCallback((nextFilters: SearchFilters) => {
    setAppliedFilters((current) => {
      if (
        current.itemName === nextFilters.itemName &&
        current.customerName === nextFilters.customerName &&
        current.dateFrom === nextFilters.dateFrom &&
        current.dateTo === nextFilters.dateTo
      ) {
        return current
      }

      return nextFilters
    })
  }, [])

  const resultsPanelKey = useMemo(
    () =>
      [
        appliedFilters.itemName,
        appliedFilters.customerName,
        appliedFilters.dateFrom,
        appliedFilters.dateTo,
      ].join('|'),
    [appliedFilters],
  )

  return (
    <section style={pageSectionStyle}>
      <FilterPanel
        initialFilters={appliedFilters}
        onApply={handleApplyFilters}
        loadCustomerOptions={loadCustomerOptions}
        loadItemOptions={loadItemOptions}
      />
      <ResultsPanel key={resultsPanelKey} filters={appliedFilters} />
    </section>
  )
}

const FilterPanel = memo(function FilterPanel({
  initialFilters,
  onApply,
  loadItemOptions,
  loadCustomerOptions,
}: {
  initialFilters: SearchFilters
  onApply: (filters: SearchFilters) => void
  loadItemOptions: (search: string) => Promise<AutocompleteOption[]>
  loadCustomerOptions: (search: string) => Promise<AutocompleteOption[]>
}) {
  const [form, setForm] = useState<SearchFilters>(initialFilters)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setForm(initialFilters)
    setFormError(null)
  }, [initialFilters])

  const setItemName = useCallback((itemName: string) => {
    setForm((current) => ({ ...current, itemName }))
  }, [])

  const setCustomerName = useCallback((customerName: string) => {
    setForm((current) => ({ ...current, customerName }))
  }, [])

  const setDateFrom = useCallback((dateFrom: string) => {
    setForm((current) => ({ ...current, dateFrom }))
  }, [])

  const setDateTo = useCallback((dateTo: string) => {
    setForm((current) => ({ ...current, dateTo }))
  }, [])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (
        form.dateFrom &&
        form.dateTo &&
        new Date(`${form.dateFrom}T00:00:00`).getTime() >
          new Date(`${form.dateTo}T00:00:00`).getTime()
      ) {
        setFormError('Date from must be on or before date to.')
        return
      }

      const normalizedFilters = {
        itemName: form.itemName.trim(),
        customerName: form.customerName.trim(),
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
      }

      setFormError(null)
      onApply(normalizedFilters)
    },
    [form, onApply],
  )

  const handleClear = useCallback(() => {
    setForm(INITIAL_FILTERS)
    setFormError(null)
    onApply(INITIAL_FILTERS)
  }, [onApply])

  return (
    <div style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div style={titleWithHelpStyle}>
          <h2 style={sectionTitleStyle}>Invoice line search</h2>
          <HelpTooltip content={SEARCH_HELP_CONTENT} />
        </div>
      </div>

      <form onSubmit={handleSubmit} style={filterFormStyle}>
        <div style={filterGridStyle}>
          <EntityAutocomplete
            label="Item Name"
            placeholder="Search items by name"
            selectedOption={null}
            inputValue={form.itemName}
            onInputChange={setItemName}
            onSelect={(option) => setItemName(option.label)}
            onClear={() => setItemName('')}
            loadOptions={loadItemOptions}
          />

          <EntityAutocomplete
            label="Customer Name"
            placeholder="Search customers by name"
            selectedOption={null}
            inputValue={form.customerName}
            onInputChange={setCustomerName}
            onSelect={(option) => setCustomerName(option.label)}
            onClear={() => setCustomerName('')}
            loadOptions={loadCustomerOptions}
          />

          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>Date From</span>
            <input
              type="date"
              value={form.dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>Date To</span>
            <input
              type="date"
              value={form.dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              style={inputStyle}
            />
          </label>
        </div>

        <div style={filterActionsRowStyle}>
          <div style={filterSummaryStyle}>Apply filters to refresh the report.</div>
          <div style={buttonRowStyle}>
            <button type="button" onClick={handleClear} style={secondaryButtonStyle}>
              Clear Filters
            </button>
            <button type="submit" style={primaryButtonStyle}>
              Apply Filters
            </button>
          </div>
        </div>

        {formError && <div style={errorBannerStyle}>{formError}</div>}
      </form>
    </div>
  )
})

const ResultsPanel = memo(function ResultsPanel({ filters }: { filters: SearchFilters }) {
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<InvoiceLineSearchSortField>('invoice_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [state, setState] = useState<LoadState>('idle')
  const [results, setResults] = useState<InvoiceLineSearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadResults = async () => {
      setState('loading')
      setError(null)

      try {
        const response = await searchInvoiceLines(buildSearchParams(filters, page, sortBy, sortDirection))
        if (!cancelled) {
          setResults(response)
          setState('success')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to search invoice lines.')
          setState('error')
        }
      }
    }

    void loadResults()

    return () => {
      cancelled = true
    }
  }, [filters, page, sortBy, sortDirection])

  const summaryParts = useMemo(() => getSummaryParts(filters), [filters])
  const totalPages = useMemo(
    () => (results ? Math.max(1, Math.ceil(results.total / results.page_size)) : 1),
    [results],
  )
  const resultCountLabel = state === 'loading' ? 'Searching...' : `${results?.total ?? 0} matching lines`

  const handleSort = useCallback((field: InvoiceLineSearchSortField) => {
    setPage(1)
    setSortBy((currentSortBy) => {
      if (currentSortBy === field) {
        setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'))
        return currentSortBy
      }

      setSortDirection(field === 'invoice_date' ? 'desc' : 'asc')
      return field
    })
  }, [])

  const handlePreviousPage = useCallback(() => {
    setPage((current) => Math.max(1, current - 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setPage((current) => Math.min(totalPages, current + 1))
  }, [totalPages])

  const renderedRows = useMemo(
    () => (results ? results.items.map((row) => <SearchResultRow key={row.invoice_line_id} row={row} />) : null),
    [results],
  )

  return (
    <div style={panelStyle}>
      <div style={resultsHeaderStyle}>
        <div style={titleWithHelpStyle}>
          <h3 style={resultsTitleStyle}>Results</h3>
          <HelpTooltip content={RESULTS_HELP_CONTENT} />
        </div>
        <div style={metricBadgeStyle}>{resultCountLabel}</div>
      </div>

      <div style={resultsToolbarStyle}>
        <div style={filterSummaryStyle}>
          {summaryParts.length > 0 ? summaryParts.join(' | ') : 'Showing all invoice lines.'}
        </div>
        {results && results.total > 0 && (
          <div style={paginationLabelStyle}>
            Page {results.page} of {totalPages}
          </div>
        )}
      </div>

      {state === 'loading' && <div style={infoCardStyle}>Loading matching invoice lines...</div>}
      {state === 'error' && <div style={errorBannerStyle}>{error ?? 'Search failed.'}</div>}
      {state === 'success' && results && results.items.length === 0 && (
        <div style={infoCardStyle}>
          No invoice lines matched the current filters. Adjust the item, customer, or date range and
          search again.
        </div>
      )}

      {state === 'success' && results && results.items.length > 0 && (
        <>
          <ResultsTable
            rows={renderedRows}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <PaginationControls
            page={results.page}
            pageSize={results.page_size}
            total={results.total}
            totalPages={totalPages}
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
          />
        </>
      )}
    </div>
  )
})

const ResultsTable = memo(function ResultsTable({
  rows,
  sortBy,
  sortDirection,
  onSort,
}: {
  rows: ReactNode
  sortBy: InvoiceLineSearchSortField
  sortDirection: SortDirection
  onSort: (field: InvoiceLineSearchSortField) => void
}) {
  const renderSortLabel = useCallback(
    (field: InvoiceLineSearchSortField) => {
      if (sortBy !== field) {
        return SORT_LABELS[field]
      }

      return `${SORT_LABELS[field]} ${sortDirection === 'asc' ? '^' : 'v'}`
    },
    [sortBy, sortDirection],
  )

  return (
    <div style={tableWrapperStyle}>
      <table style={resultsTableStyle}>
        <thead>
          <tr style={tableHeaderRowStyle}>
            <SortableHeader label={renderSortLabel('item_name')} onClick={() => onSort('item_name')} />
            <SortableHeader label={renderSortLabel('invoice_number')} onClick={() => onSort('invoice_number')} />
            <SortableHeader label={renderSortLabel('invoice_date')} onClick={() => onSort('invoice_date')} />
            <SortableHeader label={renderSortLabel('customer_name')} onClick={() => onSort('customer_name')} />
            <SortableHeader label={renderSortLabel('quantity')} align="right" onClick={() => onSort('quantity')} />
            <SortableHeader label={renderSortLabel('unit_price')} align="right" onClick={() => onSort('unit_price')} />
            <SortableHeader label={renderSortLabel('line_total')} align="right" onClick={() => onSort('line_total')} />
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  )
})

const PaginationControls = memo(function PaginationControls({
  page,
  pageSize,
  total,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div style={paginationBarStyle}>
      <div style={filterSummaryStyle}>
        Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
      </div>
      <div style={buttonRowStyle}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrevious}
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
          onClick={onNext}
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

const SearchResultRow = memo(function SearchResultRow({ row }: { row: InvoiceLineSearchRow }) {
  const handleRowClick = useCallback(() => {
    navigateTo(`/invoices/${row.invoice_id}`)
  }, [row.invoice_id])

  const handleItemClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      event.stopPropagation()
      if (row.item_id) {
        navigateTo(`/items/${row.item_id}`)
      }
    },
    [row.item_id],
  )

  const handleInvoiceClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      event.stopPropagation()
      navigateTo(`/invoices/${row.invoice_id}`)
    },
    [row.invoice_id],
  )

  const handleCustomerClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      event.stopPropagation()
      navigateTo(`/customers/${row.customer_id}`)
    },
    [row.customer_id],
  )

  return (
    <tr onClick={handleRowClick} style={tableBodyRowStyle}>
      <td style={bodyCellStyle}>
        {row.item_id ? (
          <a href={`/items/${row.item_id}`} onClick={handleItemClick} style={linkStyle}>
            {row.item_name}
          </a>
        ) : (
          <span style={rowValueStyle}>{row.item_name}</span>
        )}
      </td>
      <td style={bodyCellStyle}>
        <a href={`/invoices/${row.invoice_id}`} onClick={handleInvoiceClick} style={linkStyle}>
          {row.invoice_number}
        </a>
      </td>
      <td style={bodyCellStyle}>{formatDate(row.invoice_date)}</td>
      <td style={bodyCellStyle}>
        <a href={`/customers/${row.customer_id}`} onClick={handleCustomerClick} style={linkStyle}>
          {row.customer_name}
        </a>
      </td>
      <td style={{ ...bodyCellStyle, textAlign: 'right' }}>{row.quantity}</td>
      <td style={{ ...bodyCellStyle, textAlign: 'right' }}>{formatMoney(row.unit_price)}</td>
      <td style={{ ...bodyCellStyle, textAlign: 'right', fontWeight: 700 }}>
        {formatMoney(row.line_total)}
      </td>
    </tr>
  )
})

const SortableHeader = memo(function SortableHeader({
  label,
  onClick,
  align = 'left',
}: {
  label: string
  onClick: () => void
  align?: CSSProperties['textAlign']
}) {
  return (
    <th style={{ ...headerCellStyle, textAlign: align }}>
      <button type="button" onClick={onClick} style={sortButtonStyle}>
        {label}
      </button>
    </th>
  )
})

const pageSectionStyle: CSSProperties = {
  display: 'grid',
  gap: '24px',
}

const panelStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  padding: '24px',
  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
}

const panelHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
}

const titleWithHelpStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
}

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '1.5rem',
}

const resultsTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '1.1rem',
}

const filterFormStyle: CSSProperties = {
  display: 'grid',
  gap: '16px',
  marginTop: '18px',
}

const filterGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '14px',
}

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: '8px',
}

const fieldLabelStyle: CSSProperties = {
  fontWeight: 600,
  color: '#0f172a',
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
}

const filterActionsRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
  alignItems: 'center',
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

const metricBadgeStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: '999px',
  backgroundColor: '#ecfeff',
  color: '#155e75',
  fontWeight: 700,
  fontSize: '0.92rem',
}

const infoCardStyle: CSSProperties = {
  borderRadius: '16px',
  backgroundColor: '#f8fafc',
  color: '#475569',
  padding: '18px 20px',
}

const errorBannerStyle: CSSProperties = {
  borderRadius: '14px',
  backgroundColor: '#fef2f2',
  color: '#b91c1c',
  padding: '14px 16px',
}

const resultsHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'center',
  flexWrap: 'wrap',
  marginBottom: '16px',
}

const resultsToolbarStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'center',
  flexWrap: 'wrap',
  marginBottom: '16px',
}

const filterSummaryStyle: CSSProperties = {
  color: '#475569',
  fontSize: '0.95rem',
}

const paginationLabelStyle: CSSProperties = {
  color: '#155e75',
  fontWeight: 700,
}

const tableWrapperStyle: CSSProperties = {
  overflowX: 'auto',
}

const resultsTableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: '860px',
}

const tableHeaderRowStyle: CSSProperties = {
  borderBottom: '1px solid #e2e8f0',
  textAlign: 'left',
}

const tableBodyRowStyle: CSSProperties = {
  borderBottom: '1px solid #f1f5f9',
  cursor: 'pointer',
}

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

const headerCellStyle: CSSProperties = {
  padding: '12px 10px',
  color: '#475569',
  fontSize: '0.9rem',
  fontWeight: 700,
}

const bodyCellStyle: CSSProperties = {
  padding: '14px 10px',
  verticalAlign: 'top',
}

const rowValueStyle: CSSProperties = {
  fontWeight: 700,
}

const sortButtonStyle: CSSProperties = {
  border: 'none',
  background: 'none',
  padding: 0,
  color: 'inherit',
  font: 'inherit',
  fontWeight: 700,
  cursor: 'pointer',
}

const linkStyle: CSSProperties = {
  color: '#0f766e',
  textDecoration: 'none',
  fontWeight: 700,
}

export default InvoiceLineSearch
