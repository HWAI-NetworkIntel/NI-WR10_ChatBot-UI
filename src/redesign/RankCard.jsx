import { useState } from 'react'
import { ChartColumn, Table2 } from 'lucide-react'
import { RichText } from '@/redesign/AnswerBlocks'

function ordinalPct(rank, total) {
  return Math.max(1, Math.round((rank / total) * 100))
}

/** Rows to show in the ladder: everyone ahead of the focal payor plus the focal row, trimmed when the list is long. */
function ladderRows(standings, focal) {
  const ahead = standings.filter((row) => row.rank < focal.rank)
  if (ahead.length <= 4) return [...ahead, focal]
  return [ahead[0], ahead[1], { gap: true, payor: '…', rank: null }, ahead[ahead.length - 1], focal]
}

function StandingsTable({ standings }) {
  return (
    <div className="gx-table-scroll">
      <table className="gx-table">
        <thead><tr><th>Rank</th><th>Payor</th></tr></thead>
        <tbody>
          {standings.map((row) => (
            <tr className={row.focal ? 'is-focal' : undefined} key={row.payor}>
              <td>{row.rank}</td>
              <td>{row.payor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StandingsChart({ standings }) {
  const maxRank = Math.max(...standings.map((row) => row.rank), 1)
  return (
    <div className="gx-bars" role="img" aria-label="Ranked payors">
      {standings.map((row) => (
        <div className={`gx-bar ${row.focal ? 'is-focal' : ''}`} key={row.payor}>
          <span className="gx-bar__label">{row.rank}. {row.payor}</span>
          <span className="gx-bar__track">
            <span className="gx-bar__fill" style={{ width: `${Math.max(8, ((maxRank - row.rank + 1) / maxRank) * 100)}%` }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/** Rank answer with a focal payor: big rank, position strip, ladder of payors ahead, table/chart toggles. */
function RankCard({ content, hasTable, meta, actions }) {
  const standings = meta.standings
  const focal = standings.find((row) => row.focal)
  const [view, setView] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const total = standings.length
  const nextRank = focal.rank - 1
  const competitors = standings.filter((row) => !row.focal)
  const subject = [focal.payor, meta.planType].filter(Boolean).join(' ')
  const place = meta.county ? `${meta.county}${/county/i.test(meta.county) ? '' : ' County'}` : ''

  return (
    <section className="gx-card">
      <div className="gx-card__hero">
        <div className="gx-stack">
          <span className="gx-eyebrow">Current network rank</span>
          <div className="gx-rank">
            <span className="gx-rank__num">#{focal.rank}</span>
            <span className="gx-rank__of">of {total}</span>
          </div>
          <span className="gx-muted-dark">{subject}{place ? ` · ${place}` : ''}</span>
        </div>
        <div className="gx-stack">
          <div
            className="gx-track"
            style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
            role="img"
            aria-label={`Position ${focal.rank} of ${total} payors`}
          >
            {standings.map((row) => (
              <span className={row.focal ? 'is-you' : row.rank < focal.rank ? 'is-ahead' : ''} key={row.payor} />
            ))}
          </div>
          <div className="gx-track__legend">
            <span>#1</span>
            <strong>{focal.rank === 1 ? 'Market leader' : `Top ${ordinalPct(focal.rank, total)}% of payors`}</strong>
            <span>#{total}</span>
          </div>
        </div>
      </div>

      <div className="gx-ladder">
        {ladderRows(standings, focal).map((row, index) => (row.gap ? (
          <div className="gx-ladder__gap" key={`gap-${index}`} aria-hidden="true">⋯</div>
        ) : (
          <div className={`gx-ladder__row ${row.focal ? 'is-you' : ''}`} key={row.payor}>
            <span className="gx-ladder__rank">#{row.rank}</span>
            <span className="gx-ladder__name">{row.payor}</span>
            {!row.focal && row.rank === nextRank && <span className="gx-badge gx-badge--next">Next to pass</span>}
            {row.focal && <span className="gx-badge gx-badge--you">You</span>}
          </div>
        )))}
      </div>

      {competitors.length > 0 && (
        <div className="gx-card__section">
          <span className="gx-eyebrow">Competitor set · {competitors.length}</span>
          <div className="gx-chips">
            {competitors.map((row) => <span className="gx-chip" key={row.payor}>{row.payor}</span>)}
          </div>
        </div>
      )}

      {view && (
        <div className="gx-card__section">
          {view === 'table' ? <StandingsTable standings={standings} /> : <StandingsChart standings={standings} />}
        </div>
      )}

      {showAnswer && content && (
        <div className="gx-card__section">
          <RichText text={content} className="gx-text gx-text--small" />
        </div>
      )}

      <div className="gx-card__footer">
        <div className="gx-row">
          {!hasTable && (
            <button aria-pressed={view === 'table'} className="gx-btn gx-btn--ghost" onClick={() => setView(view === 'table' ? null : 'table')} type="button">
              <Table2 size={14} /> Table
            </button>
          )}
          <button aria-pressed={view === 'chart'} className="gx-btn gx-btn--ghost" onClick={() => setView(view === 'chart' ? null : 'chart')} type="button">
            <ChartColumn size={14} /> Chart
          </button>
          {content && (
            <button aria-pressed={showAnswer} className="gx-btn gx-btn--ghost" onClick={() => setShowAnswer((current) => !current)} type="button">
              {showAnswer ? 'Hide full answer' : 'Full answer'}
            </button>
          )}
        </div>
        {actions}
      </div>
    </section>
  )
}

export default RankCard
