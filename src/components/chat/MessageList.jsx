import { useEffect, useRef, useState } from 'react'
import { Clock3 } from 'lucide-react'

function ThinkingIndicator() {
  return (
    <div className="message-row thinking-row">
      <div className="thinking-indicator" aria-label="Genie is thinking">
        <span /><span /><span />
      </div>
    </div>
  )
}

function cellText(value) {
  if (value == null) return ''
  return String(value)
}

function AnswerDetails({ meta }) {
  if (!meta) return null
  const hasDetails = meta.explanation || meta.assumptions?.length || meta.references?.length || meta.sql || meta.columns
  if (!hasDetails) return null

  return (
    <details className="message-details">
      <summary>
        {meta.source === 'rank' ? 'Rank notes' : 'Query notes'}
      </summary>
      {meta.explanation && <p>{meta.explanation}</p>}
      {meta.assumptions?.filter((assumption) => !/network score/i.test(assumption)).length > 0 && (
        <ul>
          {meta.assumptions
            .filter((assumption) => !/network score/i.test(assumption))
            .map((assumption) => <li key={assumption}>{assumption}</li>)}
        </ul>
      )}
      {meta.columns && (
        <div className="message-table-wrap">
          <table>
            <thead>
              <tr>
                {meta.columns.map((column) => <th key={column}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {meta.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {meta.columns.map((column, columnIndex) => (
                    <td key={`${column}-${columnIndex}`}>{cellText(row[columnIndex])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {meta.rowLimitHit && <p>Showing the first rows returned.</p>}
        </div>
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

function RankBoard({ standings }) {
  const [view, setView] = useState(null)
  if (!standings?.length) return null
  const maxRank = Math.max(...standings.map((row) => row.rank), 1)

  return (
    <div className="rank-board">
      <div className="scope-suggestions" role="group" aria-label="Rank views">
        <button aria-pressed={view === 'table'} onClick={() => setView(view === 'table' ? null : 'table')} type="button">
          View as table
        </button>
        <button aria-pressed={view === 'chart'} onClick={() => setView(view === 'chart' ? null : 'chart')} type="button">
          View as chart
        </button>
      </div>
      {view === 'table' && (
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
    <div className="scope-suggestions" role="group" aria-label={field === 'payor' ? 'Payor suggestions' : 'Plan type suggestions'}>
      {suggestions.map((suggestion) => (
        <button key={suggestion} onClick={() => onSelect(field, suggestion)} type="button">
          {suggestion}
        </button>
      ))}
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
        <div className="conversation-date"><span><Clock3 size={12} /> TODAY</span></div>
        {messages.map((message, index) => (
          <article
            className={`message-row ${message.role === 'user' ? 'user-message-row' : ''}`}
            key={`${activeId}-${index}`}
          >
            <div className="message-body">
              <p>{message.content}</p>
              {message.role === 'assistant' && (
                <SuggestionChoices
                  active={!isThinking && index === messages.length - 1}
                  field={message.meta?.suggestionField}
                  onSelect={onApplySuggestion}
                  suggestions={message.meta?.suggestions}
                />
              )}
              {message.role === 'assistant' && <RankBoard standings={message.meta?.standings} />}
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
