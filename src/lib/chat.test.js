import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  assistantFromApi,
  buildNetworkScope,
  chatTranscript,
  resolveScope,
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
