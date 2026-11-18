const DATABASE_NAME = 'geniechat'
const DATABASE_VERSION = 1
const USER_ID = 'local-user'

let databasePromise

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(new Error('IndexedDB is unavailable in this browser.'))
        return
      }

      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
      let blocked = false

      request.onupgradeneeded = () => {
        const database = request.result
        database.createObjectStore('User', { keyPath: 'id' })
        const chats = database.createObjectStore('Chat', { keyPath: 'id' })
        chats.createIndex('userId', 'userId')
      }
      request.onsuccess = () => {
        const database = request.result
        if (blocked) {
          database.close()
          return
        }
        database.onversionchange = () => {
          database.close()
          databasePromise = undefined
        }
        resolve(database)
      }
      request.onerror = () => reject(request.error)
      request.onblocked = () => {
        blocked = true
        reject(new Error('Close other tabs using GenieAI to update its database.'))
      }
    }).catch((error) => {
      databasePromise = undefined
      throw error
    })
  }

  return databasePromise
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('Database transaction aborted.'))
  })
}

export async function loadChats(starterConversations) {
  const database = await openDatabase()
  const transaction = database.transaction(['User', 'Chat'], 'readwrite')
  const complete = transactionComplete(transaction)
  const users = transaction.objectStore('User')
  const chats = transaction.objectStore('Chat')
  const request = users.get(USER_ID)
  let conversations

  request.onsuccess = () => {
    if (!request.result) {
      users.add({ id: USER_ID, name: 'Local user', createdAt: new Date().toISOString() })
      starterConversations.forEach((conversation, position) => {
        chats.add({ ...conversation, userId: USER_ID, position })
      })
    }

    const chatRequest = chats.index('userId').getAll(USER_ID)
    chatRequest.onsuccess = () => {
      conversations = chatRequest.result
        .sort((first, second) => first.position - second.position)
        .map(({ userId: _userId, position: _position, ...conversation }) => conversation)
    }
  }

  await complete
  return conversations
}

export async function saveChats(conversations) {
  const database = await openDatabase()
  const transaction = database.transaction('Chat', 'readwrite')
  const complete = transactionComplete(transaction)
  const chats = transaction.objectStore('Chat')
  const request = chats.index('userId').getAllKeys(USER_ID)

  request.onsuccess = () => {
    request.result.forEach((id) => chats.delete(id))
    conversations.forEach((conversation, position) => {
      chats.put({ ...conversation, userId: USER_ID, position })
    })
  }

  await complete
}
