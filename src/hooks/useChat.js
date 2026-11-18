import { useEffect, useRef, useState } from 'react'
import { starterConversations } from '@/data/starterConversations'
import { createConversationTitle, createReply } from '@/lib/chat'
import { loadChats, saveChats } from '@/lib/db'

export function useChat() {
  const [conversations, setConversations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [storageError, setStorageError] = useState('')
  const storageReadyRef = useRef(false)
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const activeConversationRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    loadChats(starterConversations)
      .then((storedConversations) => {
        if (cancelled) return
        storageReadyRef.current = true
        setConversations(storedConversations)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Failed to load chat history:', error)
        setConversations(starterConversations)
        setStorageError('Chat storage is unavailable. Changes will be lost on refresh.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isLoading || !storageReadyRef.current) return

    let cancelled = false
    saveChats(conversations)
      .then(() => {
        if (!cancelled) setStorageError('')
      })
      .catch((error) => {
        console.error('Failed to save chat history:', error)
        if (!cancelled) setStorageError('Chat history could not be saved. Recent changes may be lost on refresh.')
      })

    return () => {
      cancelled = true
    }
  }, [conversations, isLoading])

  const startNewChat = () => {
    activeConversationRef.current = null
    setActiveId(null)
    setMessages([])
    setDraft('')
    setIsThinking(false)
  }

  const openConversation = (conversation) => {
    activeConversationRef.current = conversation.id
    setActiveId(conversation.id)
    setMessages(conversation.messages)
    setIsThinking(false)
  }

  const togglePinnedConversation = (conversationId) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, pinned: !conversation.pinned }
          : conversation,
      ),
    )
  }

  const toggleArchivedConversation = (conversationId) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, archived: !conversation.archived }
          : conversation,
      ),
    )
  }

  const deleteConversation = (conversationId) => {
    setConversations((current) =>
      current.filter((conversation) => conversation.id !== conversationId),
    )
    if (activeId === conversationId) {
      activeConversationRef.current = null
      setActiveId(null)
      setMessages([])
      setIsThinking(false)
    }
  }

  const reorderConversation = (sourceId, targetId, position) => {
    setConversations((current) => {
      const sourceIndex = current.findIndex((conversation) => conversation.id === sourceId)
      const targetIndex = current.findIndex((conversation) => conversation.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current

      const reordered = [...current]
      const [moved] = reordered.splice(sourceIndex, 1)
      const adjustedTargetIndex = targetIndex - (sourceIndex < targetIndex ? 1 : 0)
      reordered.splice(adjustedTargetIndex + (position === 'after' ? 1 : 0), 0, moved)
      return reordered
    })
  }

  const sendMessage = (content = draft) => {
    const text = content.trim()
    if (!text || isThinking || isLoading) return

    const userMessage = { role: 'user', content: text }
    const conversationId = activeId ?? crypto.randomUUID()
    const currentConversation = conversations.find(
      (conversation) => conversation.id === conversationId,
    )
    const updatedMessages = [...(currentConversation?.messages ?? messages), userMessage]

    activeConversationRef.current = conversationId
    setActiveId(conversationId)
    setMessages(updatedMessages)
    setDraft('')
    setIsThinking(true)
    setConversations((current) => {
      const exists = current.some((conversation) => conversation.id === conversationId)
      if (exists) {
        return current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, updated: 'Just now', messages: updatedMessages }
            : conversation,
        )
      }

      return [
        {
          id: conversationId,
          title: createConversationTitle(text),
          updated: 'Just now',
          messages: updatedMessages,
        },
        ...current,
      ]
    })

    window.setTimeout(() => {
      const assistantMessage = { role: 'assistant', content: createReply(text) }
      if (activeConversationRef.current === conversationId) {
        setMessages((current) => [...current, assistantMessage])
        setIsThinking(false)
      }
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, messages: [...conversation.messages, assistantMessage] }
            : conversation,
        ),
      )
    }, 650)
  }

  return {
    activeId,
    conversations,
    deleteConversation,
    draft,
    isThinking,
    isLoading,
    messages,
    openConversation,
    reorderConversation,
    sendMessage,
    setDraft,
    startNewChat,
    storageError,
    toggleArchivedConversation,
    togglePinnedConversation,
  }
}
