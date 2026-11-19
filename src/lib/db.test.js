import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deleteChat, loadChats, saveChats } from './db.js'

test('chat storage preserves history and seeds only once', async () => {
  const starterConversations = [
    { id: 'first', title: 'First chat', updated: 'Just now', messages: [] },
    { id: 'second', title: 'Second chat', updated: 'Just now', messages: [] },
  ]

  // React StrictMode may initialize storage twice concurrently.
  const initialized = await Promise.all([
    loadChats(starterConversations),
    loadChats(starterConversations),
  ])
  initialized.forEach((conversations) => assert.deepEqual(conversations, starterConversations))

  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('geniechat', 1)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  assert.deepEqual([...database.objectStoreNames], ['Chat', 'User'])
  const user = await new Promise((resolve, reject) => {
    const request = database.transaction('User').objectStore('User').get('local-user')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  assert.equal(user.name, 'Local user')
  assert.ok(Number.isFinite(Date.parse(user.createdAt)))
  database.close()

  const updated = [
    { ...starterConversations[1], pinned: true, archived: true },
    { ...starterConversations[0], messages: [{ role: 'user', content: 'Hello' }] },
  ]
  await saveChats(updated)
  assert.deepEqual(await loadChats(starterConversations), updated)

  updated[0] = { ...updated[0], pinned: false }
  await saveChats(updated)
  assert.deepEqual(await loadChats(starterConversations), updated)

  // Later queued saves must win, including removal of an earlier chat.
  await Promise.all([saveChats(updated), saveChats([updated[1]])])
  assert.deepEqual(await loadChats(starterConversations), [updated[1]])

  await deleteChat(updated[1].id)
  assert.deepEqual(await loadChats(starterConversations), [])

  await saveChats([])
  assert.deepEqual(await loadChats(starterConversations), [])
})

test('unavailable IndexedDB rejects explicitly', async () => {
  const original = globalThis.indexedDB
  try {
    globalThis.indexedDB = undefined
    const isolated = await import('./db.js?unavailable')
    await assert.rejects(isolated.loadChats([]), /IndexedDB is unavailable/)
  } finally {
    globalThis.indexedDB = original
  }
})
