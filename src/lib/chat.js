const RANK_PATTERN = /\brank\b|terminat|health system|physician group|where do we (?:land|rank)|if we (?:add|remove|drop|terminate)|adjacent count|surrounding count|best network|against payer|small groups/i
const DATA_PATTERN = /\b(how many|compare|which|list|providers?|hospitals?|enrollment|specialt(?:y|ies)|networks?|payers?|payors?|count(?:y|ies)|in-network|plans?|bid)\b/i
const RANK_FOLLOW_UP = new Set(['confirm', 'clarify', 'needs_data'])

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
  return names.filter((payor) => {
    const key = payorKey(payor)
    const stem = payorStem(payor)
    return (key && text.includes(key)) || (stem && text.includes(stem))
  })
}

/** Every rankings payor named in the question. */
export function payorsNamedInQuestion(question, payors) {
  return payorsMatchingQuestion(question, payors)
}

/** The rankings payor named in the question, when exactly one is named. */
export function payorNamedInQuestion(question, payors) {
  const matched = payorsMatchingQuestion(question, payors)
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

export function countyInQuestion(text) {
  const match = String(text || '').match(/\b(?:in|for|within)\s+([A-Za-z][A-Za-z .'-]*?)\s+county\b/i)
  return match ? match[1].trim() : ''
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

export function routeMessage(text, lastKind, memory) {
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

/** Turn an /ask, /rank, or /llm/chat JSON body into a chat message. */
export function assistantFromApi(data) {
  let content = firstText(data?.content, data?.answer, data?.explanation, data?.message, data?.error)
    || 'No response from the network service.'
  const meta = {}
  if (typeof data?.kind === 'string') meta.kind = data.kind
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
    meta.rows = data.rows.slice(0, 25)
    if (data.rowLimitHit || data.rows.length > 25) meta.rowLimitHit = true
  }
  if (Array.isArray(data?.suggestions)) {
    const suggestions = data.suggestions.filter((item) => typeof item === 'string' && item.trim())
    if (suggestions.length) meta.suggestions = suggestions
  }
  if (typeof data?.suggestionField === 'string' && data.suggestionField) meta.suggestionField = data.suggestionField
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
    if (ahead && !content.includes(ahead)) content = `${content} ${ahead}`
  }
  const message = { role: 'assistant', content }
  if (Object.keys(meta).length) message.meta = meta
  const rankSessionId = typeof data?.sessionId === 'string' && data.sessionId ? data.sessionId : undefined
  return { message, rankSessionId }
}

export function chatTranscript(messages) {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({ role: message.role, content: String(message.content || '') }))
    .slice(-20)
}
