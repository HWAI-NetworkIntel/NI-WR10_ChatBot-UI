const API_BASE = import.meta.env.VITE_API_BASE || '/api'

async function postJson(path, body) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('The network data service is not reachable. Start NI-WR10_ChatBot and try again.')
  }

  const data = await response.json().catch(() => ({}))
  if (response.ok) return data
  if (data && (data.answer || data.content || data.message || data.error || data.kind)) return data
  throw new Error(`Request failed (${response.status})`)
}

export function checkHealth() {
  return fetch(`${API_BASE}/health`).then(async (response) => {
    const body = await response.json().catch(() => ({}))
    return { ok: response.ok, body }
  })
}

export function askQuestion(payload) {
  return postJson('/ask', payload)
}

export function rankQuestion(payload) {
  return postJson('/rank', payload)
}

export function fetchRankOptions({ q, county, planType } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (county) params.set('county', county)
  if (planType) params.set('planType', planType)
  return fetch(`${API_BASE}/rank/options?${params}`).then(async (response) => {
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(body.error || 'Rank options are unavailable')
    }
    return body
  })
}

export function sendChat(messages) {
  return postJson('/llm/chat', {
    system: 'Answer in plain English for a health-plan network analyst. Stay concise.',
    messages,
  })
}
