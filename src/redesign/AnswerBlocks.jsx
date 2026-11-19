import { ExternalLink } from 'lucide-react'

/** Renders **bold** and line breaks from the service's plain-text answers. */
export function RichText({ text, className = 'gx-text' }) {
  if (!text) return null
  const lines = String(text).split(/\n+/).filter((line) => line.trim())
  return (
    <div className={className}>
      {lines.map((line, lineIndex) => (
        <p key={lineIndex}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => (
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
              : <span key={partIndex}>{part}</span>
          ))}
        </p>
      ))}
    </div>
  )
}

function cellText(value) {
  return value == null ? '' : String(value)
}

export function DataTable({ columns, rows, rowLimitHit, title }) {
  if (!columns?.length || !rows?.length) return null
  return (
    <section className="gx-table-card">
      {title && <h3 className="gx-table-title">{title}</h3>}
      <div className="gx-table-scroll">
        <table className="gx-table">
          <thead>
            <tr>
              {columns.map((column, columnIndex) => <th key={`${column}-${columnIndex}`}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column, columnIndex) => (
                  <td key={`${column}-${columnIndex}`}>
                    {cellText(Array.isArray(row) ? row[columnIndex] : row?.[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rowLimitHit && <p className="gx-table-note">Showing the first rows returned.</p>}
    </section>
  )
}

const RANK_KINDS = new Set(['baseline', 'prediction', 'confirm', 'clarify', 'needs_data'])

export function AnswerDetails({ meta }) {
  if (!meta) return null
  const assumptions = meta.assumptions?.filter((assumption) => !/network score/i.test(assumption)) || []
  const hasDetails = meta.explanation || assumptions.length || meta.references?.length || meta.sql
  if (!hasDetails) return null

  return (
    <details className="gx-details">
      <summary>{meta.source === 'rank' || RANK_KINDS.has(meta.kind) ? 'Rank notes' : 'Query notes'}</summary>
      <div className="gx-details-body">
        {meta.explanation && <p>{meta.explanation}</p>}
        {assumptions.length > 0 && (
          <ul>{assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
        )}
        {meta.references?.length > 0 && (
          <ul>
            {meta.references.map((reference) => (
              <li key={reference.table}>
                <strong>{reference.table}</strong>
                {reference.description ? ` — ${reference.description}` : ''}
              </li>
            ))}
          </ul>
        )}
        {meta.sql && <pre>{meta.sql}</pre>}
      </div>
    </details>
  )
}

const SUGGESTION_LABELS = { payor: 'Pick a payor', planType: 'Pick a plan type', question: 'Ask next' }

export function SuggestionChoices({ active, field, onSelect, suggestions }) {
  if (!active || !field || !suggestions?.length) return null
  return (
    <div className="gx-stack">
      <span className="gx-eyebrow">{SUGGESTION_LABELS[field] || 'Suggestions'}</span>
      <div className="gx-chips" role="group" aria-label={SUGGESTION_LABELS[field] || 'Suggestions'}>
        {suggestions.map((suggestion) => (
          <button className="gx-suggest" key={suggestion} onClick={() => onSelect(field, suggestion)} type="button">
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}

export function GuideLinks({ links }) {
  if (!links?.length) return null
  return (
    <div className="gx-guide">
      <span className="gx-eyebrow">For more detail, open</span>
      <div className="gx-chips">
        {links.map((link) => (link.url ? (
          <a className="gx-guide-link" key={link.label} href={link.url} rel="noopener noreferrer" target="_blank" title={link.description}>
            {link.label} <ExternalLink size={12} />
          </a>
        ) : (
          <span className="gx-guide-link is-static" key={link.label} title={link.description}>{link.label}</span>
        )))}
      </div>
    </div>
  )
}
