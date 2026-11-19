import { useEffect, useRef, useState } from 'react'
import { Clock3, ExternalLink } from 'lucide-react'

const THINKING_MESSAGES = ['Looking for data', 'Analyzing data', 'Preparing response']

function ThinkingIndicator() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setMessageIndex((current) => (current + 1) % THINKING_MESSAGES.length)
    }, 2000)

    return () => clearInterval(intervalId)
  }, [])

  return (
    <div className="message-row thinking-row">
      <div className="thinking-indicator" role="status">
        <img alt="" src="/cube-loading.webp" />
        <span>{THINKING_MESSAGES[messageIndex]}</span>
      </div>
    </div>
  )
}

function cellText(value) {
  if (value == null) return ''
  return String(value)
}

const RANK_KINDS = new Set(['baseline', 'prediction', 'confirm', 'clarify', 'needs_data'])

function normalized(text) {
  return String(text || '').trim().replace(/[?.!\s]+$/, '').toLowerCase()
}

function Interpretation({ standalone, question }) {
  if (!standalone || normalized(standalone) === normalized(question)) return null
  return <p className="message-interpretation">Interpreted as: {standalone}</p>
}

function DataTable({ columns, rows, rowLimitHit }) {
  if (!columns?.length || !rows?.length) return null
  return (
    <div className="message-table-wrap message-data-table">
      <table>
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
      {rowLimitHit && <p className="message-table-note">Showing the first rows returned.</p>}
    </div>
  )
}

function AnswerDetails({ meta }) {
  if (!meta) return null
  const hasDetails = meta.explanation || meta.assumptions?.length || meta.references?.length || meta.sql
  if (!hasDetails) return null

  return (
    <details className="message-details">
      <summary>
        {meta.source === 'rank' || RANK_KINDS.has(meta.kind) ? 'Rank notes' : 'Query notes'}
      </summary>
      {meta.explanation && <p>{meta.explanation}</p>}
      {meta.assumptions?.filter((assumption) => !/network score/i.test(assumption)).length > 0 && (
        <ul>
          {meta.assumptions
            .filter((assumption) => !/network score/i.test(assumption))
            .map((assumption) => <li key={assumption}>{assumption}</li>)}
        </ul>
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
    </details>
  )
}

/** Standings chart. The table view is only drawn for older answers that came without their own columns and rows. */
function RankBoard({ standings, hasTable }) {
  const [view, setView] = useState(() => (hasTable || standings?.some((row) => row.focal) ? null : 'table'))
  if (!standings?.length) return null
  const maxRank = Math.max(...standings.map((row) => row.rank), 1)

  return (
    <div className="rank-board">
      <div className="scope-suggestions" role="group" aria-label="Rank views">
        {!hasTable && (
          <button aria-pressed={view === 'table'} onClick={() => setView(view === 'table' ? null : 'table')} type="button">
            View as table
          </button>
        )}
        <button aria-pressed={view === 'chart'} onClick={() => setView(view === 'chart' ? null : 'chart')} type="button">
          View as chart
        </button>
      </div>
      {!hasTable && view === 'table' && (
        <div className="message-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Payor</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr className={row.focal ? 'rank-focal' : undefined} key={row.payor}>
                  <td>{row.rank}</td>
                  <td>{row.payor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view === 'chart' && (
        <div className="rank-chart" role="img" aria-label="Ranked payors">
          {standings.map((row) => (
            <div className={row.focal ? 'rank-bar focal' : 'rank-bar'} key={row.payor}>
              <span className="rank-bar-label">{row.rank}. {row.payor}</span>
              <span className="rank-bar-track">
                <span
                  className="rank-bar-fill"
                  style={{ width: `${Math.max(8, ((maxRank - row.rank + 1) / maxRank) * 100)}%` }}
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestionChoices({ active, field, onSelect, suggestions }) {
  if (!active || !field || !suggestions?.length) return null
  return (
    <div className="scope-suggestions" role="group" aria-label={SUGGESTION_LABELS[field] || 'Suggestions'}>
      {suggestions.map((suggestion) => (
        <button key={suggestion} onClick={() => onSelect(field, suggestion)} type="button">
          {suggestion}
        </button>
      ))}
    </div>
  )
}

const SUGGESTION_LABELS = { payor: 'Payor suggestions', planType: 'Plan type suggestions', question: 'Suggested questions' }

/** Dashboards with more detail. A link without a URL is shown as text so the user still knows where to look. */
function GuideLinks({ links }) {
  if (!links?.length) return null
  return (
    <div className="guide-links" role="group" aria-label="More detail in other dashboards">
      <span className="guide-links-title">For more detail, open:</span>
      {links.map((link) => (link.url ? (
        <a key={link.label} href={link.url} rel="noopener noreferrer" target="_blank" title={link.description}>
          {link.label} <ExternalLink size={11} />
        </a>
      ) : (
        <span className="guide-link-text" key={link.label} title={link.description}>{link.label}</span>
      )))}
    </div>
  )
}

function MessageList({ activeId, isThinking, messages, onApplySuggestion }) {
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  return (
    <section aria-label="Chat messages" className="messages-panel">
      <div className="messages-inner">
        {messages.map((message, index) => (
          <article
            className={`message-row ${message.role === 'user' ? 'user-message-row' : ''}`}
            key={`${activeId}-${index}`}
          >
            <div className="message-body">
              {message.role === 'assistant' && (
                <Interpretation
                  question={messages.slice(0, index).findLast((item) => item.role === 'user')?.content}
                  standalone={message.meta?.standalone}
                />
              )}
              {message.content ? <p>{message.content}</p> : null}
              {message.role === 'assistant' && (
                <DataTable
                  columns={message.meta?.columns}
                  rowLimitHit={message.meta?.rowLimitHit}
                  rows={message.meta?.rows}
                />
              )}
              {message.role === 'assistant' && (
                <SuggestionChoices
                  active={!isThinking && index === messages.length - 1}
                  field={message.meta?.suggestionField}
                  onSelect={onApplySuggestion}
                  suggestions={message.meta?.suggestions}
                />
              )}
              {message.role === 'assistant' && <GuideLinks links={message.meta?.links} />}
              {message.role === 'assistant' && <RankBoard hasTable={Boolean(message.meta?.columns?.length && message.meta?.rows?.length)} standings={message.meta?.standings} />}
              {message.role === 'assistant' && <AnswerDetails meta={message.meta} />}
            </div>
          </article>
        ))}
        {isThinking && <ThinkingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </section>
  )
}

export default MessageList
