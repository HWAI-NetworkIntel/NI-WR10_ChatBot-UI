const RANK_PATTERN = /\brank(?:ed|ing)?\b|\btop\s+\d+\b|terminat|health system|physician group|where do we (?:land|rank)|if we (?:add|remove|drop|terminate)|adjacent count|surrounding count|best network|against payer|small groups/i
const DATA_PATTERN = /\b(how many|compare|which|list|providers?|hospitals?|enrollment|specialt(?:y|ies)|networks?|payers?|payors?|count(?:y|ies)|in-network|plans?|bid)\b/i
const RANK_FOLLOW_UP = new Set(['confirm', 'clarify', 'needs_data'])

// Same idea as the service guardrail (services/guidance.js). The service still decides; this only skips the payor prompt.
const RULE_OVERRIDE = /\b(ignore|disregard|forget|bypass|override)\b.{0,30}\b(rules?|instructions?|guardrails?|restrictions?|prompt|polic(?:y|ies))\b|\b(system prompt|developer mode|jailbreak|pretend (?:you are|to be))\b/i
const WRITE_REQUEST = /\b(update|delete|insert|modify|edit|alter|truncate|drop|overwrite|change|write to)\b.{0,40}\b(tables?|records?|rows?|database|db|columns?|schema|network data)\b|\b(delete\s+from|insert\s+into|drop\s+table|alter\s+table|truncate\s+table|update\s+\w+\s+set)\b/i

/** True for requests to change data or set aside the assistant's rules. */
export function isBlockedQuestion(text) {
  const value = String(text || '')
  if (/\b(add|remove|drop|hide|include)\b(?:\s+\S+){0,6}\s+columns?\b/i.test(value) && !RULE_OVERRIDE.test(value)) return false
  return RULE_OVERRIDE.test(value) || WRITE_REQUEST.test(value)
}

export function createConversationTitle(prompt) {
  return prompt.length > 58 ? `${prompt.slice(0, 58)}…` : prompt
}

export function parseCsvList(value) {
  const seen = new Set()
  const items = []
  for (const part of String(value || '').split(',')) {
    const item = part.trim()
    const key = item.toLowerCase()
    if (!item || seen.has(key)) continue
    seen.add(key)
    items.push(item)
  }
  return items
}

/** One chosen payor and plan type. Names such as "UnitedHealth Group, Inc." stay intact. */
export function selectedScope(payorText, planTypeText) {
  const payor = String(payorText || '').trim()
  const planType = String(planTypeText || '').trim()
  return {
    payors: payor ? [payor] : [],
    payorsCrossPlanTypes: payor && planType ? [{ payor, planType }] : [],
  }
}

/** Payors and the payor × plan type pairs required by /ask and /rank. */
export function buildNetworkScope(payorsText, planTypesText) {
  const payors = parseCsvList(payorsText)
  const planTypes = parseCsvList(planTypesText)
  return {
    payors,
    payorsCrossPlanTypes: payors.flatMap((payor) =>
      planTypes.map((planType) => ({ payor, planType })),
    ),
  }
}

export function scopeError(scope) {
  if (!scope.payors.length) return 'Add at least one payor before asking a network question.'
  if (!scope.payorsCrossPlanTypes.length) return 'Add at least one plan type before asking a network question.'
  if (scope.payors.some((payor) => payor.length > 200)) return 'Each payor must be 200 characters or fewer.'
  if (scope.payorsCrossPlanTypes.some((pair) => pair.planType.length > 25)) {
    return 'Each plan type must be 25 characters or fewer.'
  }
  return ''
}

/** The next unselected scope field, with choices supplied by the rankings file. */
export function scopeSuggestion({ payorsText, planTypesText, options, requirePlanType = true }) {
  const selectedPayor = String(payorsText || '').trim()
  const selectedType = String(planTypesText || '').trim()
  const county = options?.county
  const place = county ? `${county} County` : 'Texas'
  const planTypes = Array.isArray(options?.planTypes) ? options.planTypes : []
  const payors = Array.isArray(options?.payors) ? options.payors : []
  if (!planTypes.length && !payors.length) {
    return {
      content: county
        ? `I don't have network rankings for ${place}. Name another Texas county.`
        : 'Name a Texas county, and I will suggest a plan type and payor.',
      suggestions: [],
      suggestionField: '',
    }
  }
  if (requirePlanType && !selectedType) {
    return {
      content: `Which plan type should I use for ${place}?`,
      suggestions: planTypes,
      suggestionField: 'planType',
    }
  }
  if (!selectedPayor) {
    return {
      content: `Which payor should I use for ${place} ${selectedType}?`,
      suggestions: payors,
      suggestionField: 'payor',
    }
  }
  return null
}

function payorKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function payorStem(name) {
  let key = payorKey(name)
  let previous = ''
  while (key && key !== previous) {
    previous = key
    key = key.replace(/(incorporated|corporation|healthcare|company|group|health|corp|inc|llc|co)$/, '')
  }
  return previous.length >= 3 ? previous : ''
}

function payorsMatchingQuestion(question, payors) {
  const text = payorKey(question)
  const names = [...new Set((payors || []).filter((payor) => typeof payor === 'string' && payor.trim()))]
  if (!text || !names.length) return []
  const exact = names.filter((payor) => {
    const key = payorKey(payor)
    const stem = payorStem(payor)
    return (key && text.includes(key)) || (stem && text.includes(stem))
  })
  if (exact.length) return exact
  // Typos such as "cenetne": accept a close spelling only when exactly one payor fits.
  const close = names.filter((payor) => misspells(question, payor))
  return close.length === 1 ? close : []
}

/** Edit distance with adjacent swaps, so "cenetne" is 1 away from "centene". */
function typoDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j += 1) rows[0][j] = j
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1)
    }
  }
  return rows[a.length][b.length]
}

/** A word of 5+ letters within 1 edit (2 for long names) of the payor's stem or first word. */
function misspells(question, payor) {
  const targets = [...new Set([payorStem(payor), payorKey(String(payor).split(/[\s,]+/)[0])].filter((value) => value && value.length >= 5))]
  const words = String(question || '').toLowerCase().match(/[a-z]{5,}/g) || []
  return words.some((word) => targets.some((target) => typoDistance(word, target) <= (target.length >= 9 ? 2 : 1)))
}

/** Every rankings payor named in the question. */
export function payorsNamedInQuestion(question, payors) {
  return payorsMatchingQuestion(question, payors)
}

function comparedPayor(question) {
  const match = String(question || '').match(/\b(?:against|versus|vs\.?|compared? (?:with|to))\s+(?:payer\s+|payor\s+)?["']?([A-Za-z0-9][A-Za-z0-9 .&'-]*?)["']?(?=\s+in\b|[?.!]|$)/i)
  return match ? match[1].trim() : ''
}

function isComparedPayor(payor, question) {
  const target = payorKey(comparedPayor(question))
  if (target.length < 3) return false
  const full = payorKey(payor)
  const stem = payorStem(payor)
  return target === full || (stem && (target === stem || target.startsWith(stem) || stem.startsWith(target)))
}

/** The rankings payor named in the question, when exactly one is named. The payer after "against" stays the comparison target. */
export function payorNamedInQuestion(question, payors) {
  const matched = payorsMatchingQuestion(question, payors).filter((payor) => !isComparedPayor(payor, question))
  if (matched.length === 1) return matched[0]
  if (matched.length < 2) return ''
  const full = matched.filter((payor) => payorKey(question).includes(payorKey(payor)))
  return full.length === 1 ? full[0] : ''
}

/** The plan type named in the question, when exactly one loaded type appears. */
export function planTypeNamedInQuestion(question, planTypes) {
  const named = (planTypes || []).filter((type) => (
    typeof type === 'string'
    && type.trim()
    && new RegExp(`\\b${type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(question)
  ))
  return named.length === 1 ? named[0] : ''
}

function usableCounty(value) {
  const text = String(value || '').trim()
  if (!text || /\b(what|which|all|every|any|its|it's|available|where)\b/i.test(text)) return ''
  return text
}

export function countyInQuestion(text) {
  const source = String(text || '').trim()
  const directed = source.match(/\b(?:in|for|within)\s+([A-Za-z][A-Za-z .'-]*?)\s+county\b/i)
  if (directed) return usableCounty(directed[1])
  const labeled = source.match(/^([A-Za-z][A-Za-z .'-]*?)\s+county(?:\s*,?\s*(?:texas|tx))?\.?$/i)
  return labeled ? usableCounty(labeled[1]) : ''
}

/** County the answer is about. The county named in this message wins over a remembered one. */
export function responseCounty({ question, memoryCounty, optionsCounty } = {}) {
  return countyInQuestion(question) || optionsCounty || memoryCounty || ''
}

/** Keep a chosen payor, plan type, and county for later questions in the same chat. */
export function resolveScope({ payorText, planTypeText, question, memory }) {
  const payor = String(payorText || '').trim() || memory?.payor || ''
  const planType = String(planTypeText || '').trim() || memory?.planType || ''
  const county = countyInQuestion(question) || memory?.county || ''
  return { payor, planType, county, ...selectedScope(payor, planType) }
}

const RANK_SENTENCE = /^(.+?)\s+(HMO|PPO|EPO|POS)\s+is rank\s+\d+\s+of\s+\d+\s+in\s+([A-Za-z][A-Za-z .'-]*?)\s+County\b/i

/** Recover payor, plan type, and county from this chat, including an earlier rank sentence. */
export function scopeFromHistory(messages, stored) {
  const memory = {
    payor: stored?.payor || '',
    planType: stored?.planType || '',
    county: stored?.county || '',
  }
  const list = Array.isArray(messages) ? messages : []
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const message = list[index]
    const meta = message?.meta
    if (!memory.payor && meta?.payor) memory.payor = meta.payor
    if (!memory.planType && meta?.planType) memory.planType = meta.planType
    if (!memory.county && meta?.county) memory.county = meta.county
    if (message?.role === 'assistant' && (!memory.payor || !memory.planType || !memory.county)) {
      const match = String(message.content || '').match(RANK_SENTENCE)
      if (match) {
        memory.payor = memory.payor || match[1].trim()
        memory.planType = memory.planType || match[2].toUpperCase()
        memory.county = memory.county || match[3].trim()
      }
    }
    if (memory.payor && memory.planType && memory.county) break
  }
  return memory
}

const PROVIDER_QUESTION = /\b(cardiolog|specialt|providers?|hospitals?|how many|enrollment|bid|compare)\b/i

export function listsRankedPayors(text) {
  const value = String(text || '').trim()
  if (/\b(top\s+\d+|highest\s+rank|best\s+rank|ranked\s+pay(?:er|or)s?)\b/i.test(value)) return true
  return /^(?:in\s+)?[a-z][a-z .'-]{0,40}\s+county(?:\s*,?\s*(?:texas|tx))?$/i.test(value)
    || /^(?:in\s+)[a-z][a-z .'-]{1,40}$/i.test(value)
}

const TABLE_FOLLOW_UP = /\b(?:add|remove|drop|include|exclude|show|hide)\b.*\bcolumns?\b|\bcolumns?\s+for\b|\bsort(?:ed)?\s+by\b|\border\s+by\b|\bsame\s+(?:for|but|thing)\b|^(?:and|what about|how about)\s+(?:for\s+)?[A-Za-z]/i
const ANSWER_SOURCES = new Set(['ask', 'rank'])

/** True when the text only makes sense against the previous answer, e.g. "add a column for enrollment". */
export function isTableFollowUp(text) {
  return TABLE_FOLLOW_UP.test(String(text || '').trim())
}

export function routeMessage(text, lastKind, memory, lastSource) {
  if (listsRankedPayors(text)) return 'rank'
  if (ANSWER_SOURCES.has(lastSource) && isTableFollowUp(text)) return lastSource
  if (lastSource === 'ask' && RANK_FOLLOW_UP.has(lastKind) && !RANK_PATTERN.test(text)) return 'ask'
  if (PROVIDER_QUESTION.test(text) && !RANK_PATTERN.test(text)) return 'ask'
  if (RANK_PATTERN.test(text)) return 'rank'
  if (memory?.payor && memory?.planType && /\b(difference|versus|vs\.?|better|between)\b/i.test(text)) return 'rank'
  if (RANK_FOLLOW_UP.has(lastKind) && !DATA_PATTERN.test(text)) return 'rank'
  if (DATA_PATTERN.test(text)) return 'ask'
  return 'chat'
}

function firstText(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function rankLabel(rank) {
  const n = Math.abs(Number(rank))
  const mod100 = n % 100
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')
  return `${n}${suffix}`
}

/** Named payors from 1st through the rank just ahead of the asked payor. */
export function ranksAheadSentence(standings) {
  const rows = Array.isArray(standings) ? standings : []
  const focal = rows.find((row) => row.focal)
  if (!focal || !(focal.rank > 1)) return ''
  const ahead = rows.filter((row) => row.rank < focal.rank).sort((a, b) => a.rank - b.rank)
  if (!ahead.length) return ''
  const names = ahead.map((row) => `${row.payor} (${rankLabel(row.rank)})`)
  const listed = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`
  return `The payors ranked ${rankLabel(1)} through ${rankLabel(focal.rank - 1)} are ${listed}.`
}

function markdownCells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')
    .map((cell) => cell.trim().replace(/^\*\*(.*)\*\*$/, '$1').replace(/^`(.*)`$/, '$1'))
}

const TABLE_DIVIDER = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/

/** The first markdown table in the text, plus the text without it. */
export function parseMarkdownTable(text) {
  const lines = String(text || '').split(/\r?\n/)
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!lines[index].includes('|') || !TABLE_DIVIDER.test(lines[index + 1])) continue
    const columns = markdownCells(lines[index])
    if (columns.length < 2) continue
    let end = index + 2
    const rows = []
    while (end < lines.length && lines[end].includes('|') && lines[end].trim()) {
      const cells = markdownCells(lines[end])
      rows.push(columns.map((_, cellIndex) => cells[cellIndex] ?? ''))
      end += 1
    }
    const rest = [...lines.slice(0, index), ...lines.slice(end)].join('\n').replace(/\n{3,}/g, '\n\n').trim()
    return { columns, rows, text: rest }
  }
  return null
}

/** Turn an /ask, /rank, or /llm/chat JSON body into a chat message. */
export function assistantFromApi(data) {
  let content = firstText(data?.content, data?.answer, data?.explanation, data?.message, data?.error)
    || 'No response from the network service.'
  const meta = { fromService: true }
  if (typeof data?.kind === 'string') meta.kind = data.kind
  const standalone = firstText(data?.standalone)
  if (standalone) meta.standalone = standalone
  const markdownTable = parseMarkdownTable(content)
  if (markdownTable) {
    content = markdownTable.text
    if (!(Array.isArray(data?.columns) && Array.isArray(data?.rows) && data.rows.length) && markdownTable.rows.length) {
      meta.columns = markdownTable.columns
      meta.rows = markdownTable.rows.slice(0, 50)
      if (markdownTable.rows.length > 50) meta.rowLimitHit = true
    }
  }
  const explanation = firstText(data?.explanation)
  if (explanation && explanation !== content) meta.explanation = explanation
  if (Array.isArray(data?.assumptions)) {
    const assumptions = data.assumptions.filter((item) => typeof item === 'string' && item.trim())
    if (assumptions.length) meta.assumptions = assumptions
  }
  if (typeof data?.sql === 'string' && data.sql.trim()) meta.sql = data.sql
  if (Array.isArray(data?.references)) {
    const references = data.references.filter((item) => item && typeof item.table === 'string')
    if (references.length) meta.references = references
  }
  if (Array.isArray(data?.columns) && Array.isArray(data?.rows) && data.rows.length) {
    meta.columns = data.columns.map((column) => String(column))
    meta.rows = data.rows.slice(0, 50)
    if (data.rowLimitHit || data.rows.length > 50) meta.rowLimitHit = true
  }
  // Several titled tables in one answer, e.g. "what to improve to pass X" and "to reach the leader".
  if (Array.isArray(data?.tables)) {
    const tables = data.tables
      .filter((table) => table && Array.isArray(table.columns) && Array.isArray(table.rows) && table.rows.length)
      .map((table) => ({
        title: typeof table.title === 'string' ? table.title : '',
        columns: table.columns.map((column) => String(column)),
        rows: table.rows.slice(0, 50),
      }))
    if (tables.length) meta.tables = tables
  }
  if (Array.isArray(data?.suggestions)) {
    const suggestions = data.suggestions.filter((item) => typeof item === 'string' && item.trim())
    if (suggestions.length) meta.suggestions = suggestions
  }
  if (typeof data?.suggestionField === 'string' && data.suggestionField) meta.suggestionField = data.suggestionField
  if (Array.isArray(data?.links)) {
    const links = data.links
      .filter((link) => link && typeof link.label === 'string' && link.label.trim())
      .map((link) => ({
        label: link.label.trim(),
        url: typeof link.url === 'string' && /^https?:\/\//i.test(link.url) ? link.url : '',
        description: typeof link.description === 'string' ? link.description : '',
      }))
    if (links.length) meta.links = links
  }
  if (typeof data?.geography?.county === 'string' && data.geography.county) meta.county = data.geography.county
  if (typeof data?.focal?.payor === 'string' && data.focal.payor) meta.payor = data.focal.payor
  if (typeof data?.focal?.planType === 'string' && data.focal.planType) meta.planType = data.focal.planType
  if (Array.isArray(data?.standings)) {
    const standings = data.standings
      .filter((row) => row && typeof row.payor === 'string' && Number.isFinite(Number(row.rank)))
      .map((row) => ({
        payor: row.payor,
        rank: Number(row.rank),
        score: Number(row.value),
        focal: Boolean(row.focal),
      }))
      .sort((a, b) => a.rank - b.rank || a.payor.localeCompare(b.payor))
    if (standings.length) meta.standings = standings
    const ahead = ranksAheadSentence(standings)
    if (ahead && !content.includes(ahead)) {
      content = content.trim() ? `${content.trim()} ${ahead}` : ahead
    }
  }
  if (!String(content).trim()) {
    content = meta.columns?.length ? '' : 'No response from the network service.'
  }
  const message = { role: 'assistant', content }
  if (Object.keys(meta).length) message.meta = meta
  const rankSessionId = typeof data?.sessionId === 'string' && data.sessionId ? data.sessionId : undefined
  return { message, rankSessionId }
}

function historyCell(value) {
  return value == null ? '' : String(value).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
}

/** Prose plus any columns/rows, so a follow-up such as "add a column" can see the table. */
function historyContent(message) {
  const content = String(message?.content || '')
  const columns = Array.isArray(message?.meta?.columns) ? message.meta.columns.map((column) => String(column)) : []
  const rows = Array.isArray(message?.meta?.rows) ? message.meta.rows : []
  if (!columns.length || !rows.length || content.includes('|')) return content
  const header = `| ${columns.map((column) => historyCell(column)).join(' | ')} |`
  const rule = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map((row) => (
    `| ${columns.map((column, index) => historyCell(Array.isArray(row) ? row[index] : row?.[column])).join(' | ')} |`
  )).join('\n')
  const table = `${header}\n${rule}\n${body}`
  return content.trim() ? `${content.trim()}\n\n${table}` : table
}

export function chatTranscript(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({ role: message.role, content: historyContent(message) }))
    .slice(-20)
}

/** Prior turns for /ask. The current question is sent separately. */
export function conversationHistory(messages, question) {
  const transcript = chatTranscript(messages)
  const last = transcript.at(-1)
  if (last?.role === 'user' && last.content === String(question || '').trim()) {
    return transcript.slice(0, -1)
  }
  return transcript
}

