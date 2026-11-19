import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  assistantFromApi,
  buildNetworkScope,
  chatTranscript,
  conversationHistory,
  isTableFollowUp,
  parseMarkdownTable,
  resolveScope,
  responseCounty,
  payorNamedInQuestion,
  payorsNamedInQuestion,
  planTypeNamedInQuestion,
  routeMessage,
  scopeError,
  scopeFromHistory,
  scopeSuggestion,
} from './chat.js'

test('network scope builds the payor and plan type cross', () => {
  const scope = buildNetworkScope('Humana, UnitedHealthcare, Humana', 'HMO, PPO')
  assert.deepEqual(scope.payors, ['Humana', 'UnitedHealthcare'])
  assert.deepEqual(scope.payorsCrossPlanTypes, [
    { payor: 'Humana', planType: 'HMO' },
    { payor: 'Humana', planType: 'PPO' },
    { payor: 'UnitedHealthcare', planType: 'HMO' },
    { payor: 'UnitedHealthcare', planType: 'PPO' },
  ])
  assert.equal(scopeError(scope), '')
  assert.match(scopeError(buildNetworkScope('', 'HMO')), /payor/)
  assert.match(scopeError(buildNetworkScope('Humana', '')), /plan type/)
})

test('scope suggestions ask for a plan type before a payor', () => {
  const planType = scopeSuggestion({
    payorsText: '',
    planTypesText: '',
    options: { county: 'Houston', planTypes: ['HMO', 'PPO'], payors: ['Humana Inc.'] },
  })
  assert.equal(planType.suggestionField, 'planType')
  assert.deepEqual(planType.suggestions, ['HMO', 'PPO'])
  assert.match(planType.content, /Houston County/)

  const payor = scopeSuggestion({
    payorsText: '',
    planTypesText: 'HMO',
    options: { county: 'Houston', planTypes: ['HMO', 'PPO'], payors: ['CVS Health Corporation', 'Molina Healthcare, Inc.'] },
  })
  assert.equal(payor.suggestionField, 'payor')
  assert.equal(payor.suggestions[0], 'CVS Health Corporation')
  assert.equal(scopeSuggestion({
    payorsText: 'UnitedHealth Group, Inc.',
    planTypesText: 'HMO',
    options: { county: 'Houston', planTypes: ['HMO'], payors: ['UnitedHealth Group, Inc.'] },
  }), null)
})

test('a payor named in the question is not offered again', () => {
  const payors = [
    'CVS Health Corporation',
    'Health Care Service Corporation',
    'Humana Inc.',
    'Molina Healthcare, Inc.',
    'UnitedHealth Group, Inc.',
  ]
  assert.equal(payorNamedInQuestion('Where does Humana rank in Dallas County?', payors), 'Humana Inc.')
  assert.equal(payorNamedInQuestion('Where do we rank in Houston County today for Humana', payors), 'Humana Inc.')
  assert.equal(payorNamedInQuestion('Where does UnitedHealthcare rank in Dallas County?', payors), 'UnitedHealth Group, Inc.')
  assert.equal(payorNamedInQuestion('Where do we rank in Houston County today?', payors), '')
  assert.equal(planTypeNamedInQuestion('Where does Humana HMO rank in Dallas County?', ['HMO', 'PPO']), 'HMO')
  assert.equal(planTypeNamedInQuestion('Where does Humana rank in Dallas County?', ['HMO', 'PPO']), '')
  assert.deepEqual(payorsNamedInQuestion('Compare Humana and UnitedHealthcare cardiologists in Harris County', payors), [
    'Humana Inc.',
    'UnitedHealth Group, Inc.',
  ])
})

test('questions route to rank, ask, or chat', () => {
  assert.equal(routeMessage('Where does Humana rank in Houston County?'), 'rank')
  assert.equal(routeMessage('yes', 'confirm'), 'rank')
  assert.equal(routeMessage('in harris county'), 'rank')
  assert.equal(routeMessage('what is highest rank payer in houston county of texas'), 'rank')
  assert.equal(routeMessage('give me top 10 ranked payers of hmo type in houston'), 'rank')
  assert.equal(routeMessage('How many providers does Humana have in Dallas County?'), 'ask')
  assert.equal(routeMessage('Compare Humana and UnitedHealthcare cardiologists in Harris County', undefined, {
    payor: 'CVS Health Corporation',
    planType: 'HMO',
  }), 'ask')
  assert.equal(routeMessage('Thanks, that helps'), 'chat')
  assert.equal(routeMessage('What is the difference between CVS network and me', 'baseline', {
    payor: 'Health Care Service Corporation',
    planType: 'HMO',
  }), 'rank')
})

test('a typed county is the county in the answer, not a remembered one', () => {
  assert.equal(responseCounty({
    question: 'for what all county its available',
    memoryCounty: 'Dallas',
  }), 'Dallas')
  assert.equal(responseCounty({
    question: 'Harris County',
    memoryCounty: 'Houston',
    optionsCounty: 'Houston',
  }), 'Harris')
  assert.equal(responseCounty({
    question: 'in Houston County',
    memoryCounty: 'Dallas',
  }), 'Houston')
  assert.equal(responseCounty({
    question: 'harris',
    memoryCounty: 'Dallas',
    optionsCounty: 'Harris',
  }), 'Harris')
  assert.equal(responseCounty({
    question: 'which network has best and worst rank',
    memoryCounty: 'Houston',
  }), 'Houston')
})

test('later questions keep the payor, plan type, and county', () => {
  const resolved = resolveScope({
    payorText: '',
    planTypeText: '',
    question: 'What is the difference between CVS network and me',
    memory: { payor: 'Health Care Service Corporation', planType: 'HMO', county: 'Houston' },
  })
  assert.equal(resolved.payor, 'Health Care Service Corporation')
  assert.equal(resolved.planType, 'HMO')
  assert.equal(resolved.county, 'Houston')
  assert.deepEqual(resolved.payors, ['Health Care Service Corporation'])

  const remembered = scopeFromHistory([
    {
      role: 'assistant',
      content: 'Health Care Service Corporation HMO is rank 5 of 7 in Houston County, Texas, on the provider dashboard ranking.',
    },
  ])
  assert.equal(remembered.payor, 'Health Care Service Corporation')
  assert.equal(remembered.planType, 'HMO')
  assert.equal(remembered.county, 'Houston')
})

test('a payer named after against is not treated as the selected payor', () => {
  const payors = ['Humana Inc.', 'CVS Health Corporation', 'UnitedHealth Group, Inc.']
  assert.equal(payorNamedInQuestion('How do we rank against payer CVS?', payors), '')
  assert.equal(payorNamedInQuestion('Where does Humana rank in Dallas County?', payors), 'Humana Inc.')
})

test('api payloads become assistant messages', () => {
  const dataReply = assistantFromApi({
    kind: 'data',
    answer: 'Humana has 12 providers.',
    explanation: 'Counted providers.',
    assumptions: ['Texas'],
    sql: 'SELECT 1',
    references: [{ table: 'ParentOrganization', description: 'Payers' }],
    columns: ['Payer', 'Providers'],
    rows: [['Humana', 12]],
  })
  assert.equal(dataReply.message.content, 'Humana has 12 providers.')
  assert.equal(dataReply.message.meta.kind, 'data')
  assert.deepEqual(dataReply.message.meta.rows, [['Humana', 12]])

  const rankReply = assistantFromApi({
    kind: 'baseline',
    answer: 'UnitedHealth Group, Inc. HMO is rank 7 of 7.',
    sessionId: 'session-1',
    standings: [
      { payor: 'UnitedHealth Group, Inc.', value: 43, focal: true, rank: 7 },
      { payor: 'CVS Health Corporation', value: 85, focal: false, rank: 1 },
    ],
  })
  assert.equal(rankReply.rankSessionId, 'session-1')
  assert.equal(rankReply.message.meta.kind, 'baseline')
  assert.deepEqual(rankReply.message.meta.standings, [
    { payor: 'CVS Health Corporation', rank: 1, score: 85, focal: false },
    { payor: 'UnitedHealth Group, Inc.', rank: 7, score: 43, focal: true },
  ])
  assert.match(rankReply.message.content, /The payors ranked 1st through 6th are CVS Health Corporation \(1st\)\./)

  const transcript = chatTranscript([
    { role: 'user', content: 'Hello', meta: { kind: 'ignored' } },
    { role: 'assistant', content: 'Hi' },
  ])
  assert.deepEqual(transcript, [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi' },
  ])
})

test('markdown tables in answers become columns and rows', () => {
  const parsed = parseMarkdownTable('Top payors:\n\n| Rank | Payor | Score |\n|---|---|---:|\n| 1 | **CVS** | 85 |\n| 2 | Humana | 70 |\n\nCVS leads.')
  assert.deepEqual(parsed.columns, ['Rank', 'Payor', 'Score'])
  assert.deepEqual(parsed.rows, [['1', 'CVS', '85'], ['2', 'Humana', '70']])
  assert.equal(parsed.text, 'Top payors:\n\nCVS leads.')
  assert.equal(parseMarkdownTable('No table here | really'), null)

  const reply = assistantFromApi({
    kind: 'baseline',
    answer: 'Ranking:\n| Rank | Payor |\n| --- | --- |\n| 1 | CVS |',
    standalone: 'Where does CVS rank in Harris County for HMO?',
  })
  assert.equal(reply.message.content, 'Ranking:')
  assert.deepEqual(reply.message.meta.columns, ['Rank', 'Payor'])
  assert.deepEqual(reply.message.meta.rows, [['1', 'CVS']])
  assert.equal(reply.message.meta.standalone, 'Where does CVS rank in Harris County for HMO?')

  const structured = assistantFromApi({
    answer: '| A | B |\n|---|---|\n| 1 | 2 |',
    columns: ['Payer', 'Providers'],
    rows: [['Humana', 12]],
  })
  assert.deepEqual(structured.message.meta.columns, ['Payer', 'Providers'])
})

test('ask rank answers keep their text, and history keeps the table', () => {
  for (const kind of ['baseline', 'prediction', 'clarify']) {
    const reply = assistantFromApi({ kind, answer: `${kind} answer` })
    assert.equal(reply.message.content, `${kind} answer`)
    assert.equal(reply.message.meta.kind, kind)
    assert.equal(reply.message.meta.fromService, true)
  }

  const clarify = assistantFromApi({
    kind: 'clarify',
    answer: 'Which county should I use?',
    suggestions: ['Harris', 'Dallas'],
  })
  assert.equal(clarify.message.content, 'Which county should I use?')
  assert.deepEqual(clarify.message.meta.suggestions, ['Harris', 'Dallas'])

  const tableOnly = assistantFromApi({
    kind: 'prediction',
    answer: '| Payor | Rank |\n| --- | --- |\n| CVS | 1 |',
    standalone: 'CVS rank after adding Memorial Hermann',
  })
  assert.equal(tableOnly.message.content, '')
  assert.deepEqual(tableOnly.message.meta.columns, ['Payor', 'Rank'])
  assert.deepEqual(tableOnly.message.meta.rows, [['CVS', '1']])
  assert.equal(tableOnly.message.meta.standalone, 'CVS rank after adding Memorial Hermann')

  const history = conversationHistory([
    { role: 'user', content: 'How many providers does Humana have?' },
    {
      role: 'assistant',
      content: 'Humana has 12 providers.',
      meta: { columns: ['Payer', 'Providers'], rows: [['Humana', 12]] },
    },
    { role: 'user', content: 'add a column' },
  ], 'add a column')
  assert.deepEqual(history[0], { role: 'user', content: 'How many providers does Humana have?' })
  assert.equal(history[1].role, 'assistant')
  assert.match(history[1].content, /Humana has 12 providers\./)
  assert.match(history[1].content, /\| Payer \| Providers \|/)
  assert.match(history[1].content, /\| Humana \| 12 \|/)
  assert.equal(history.length, 2)
  assert.deepEqual(conversationHistory([{ role: 'user', content: 'How many providers?' }], 'How many providers?'), [])
})

test('table follow-ups go back to the service that answered', () => {
  assert.equal(isTableFollowUp('add a column for enrollment'), true)
  assert.equal(isTableFollowUp('sort by score'), true)
  assert.equal(isTableFollowUp('Compare Humana and CVS'), false)
  assert.equal(routeMessage('add a column for adjacent count', undefined, {}, 'ask'), 'ask')
  assert.equal(routeMessage('add a column for providers', undefined, {}, 'rank'), 'rank')
  assert.equal(routeMessage('Humana', 'clarify', {}, 'ask'), 'ask')
  assert.equal(routeMessage('yes', 'confirm', {}, 'rank'), 'rank')
})
