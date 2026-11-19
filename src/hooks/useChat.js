import { useEffect, useRef, useState } from 'react'
import { starterConversations } from '@/data/starterConversations'
import { askQuestion, checkHealth, fetchRankOptions, rankQuestion, sendChat } from '@/lib/api'
import {
  assistantFromApi,
  chatTranscript,
  conversationHistory,
  createConversationTitle,
  isBlockedQuestion,
  isTableFollowUp,
  resolveScope,
  responseCounty,
  payorNamedInQuestion,
  payorsNamedInQuestion,
  planTypeNamedInQuestion,
  listsRankedPayors,
  routeMessage,
  scopeError,
  scopeFromHistory,
  scopeSuggestion,
} from '@/lib/chat'
import { deleteChat, loadChats, saveChats } from '@/lib/db'

export function useChat() {
  const [conversations, setConversations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [storageError, setStorageError] = useState('')
  const storageReadyRef = useRef(false)
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [payors, setPayors] = useState('')
  const [planTypes, setPlanTypes] = useState('')
  const [apiStatus, setApiStatus] = useState('')
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
    let cancelled = false

    checkHealth()
      .then(({ ok, body }) => {
        if (cancelled || ok) return
        setApiStatus(body?.message || 'The network data service is unavailable.')
      })
      .catch(() => {
        if (!cancelled) {
          setApiStatus('The network data service is not running. Start NI-WR10_ChatBot on port 4010.')
        }
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
    setPayors('')
    setPlanTypes('')
    setIsThinking(false)
  }

  const openConversation = (conversation) => {
    const memory = scopeFromHistory(conversation.messages, conversation.scopeMemory)
    activeConversationRef.current = conversation.id
    setActiveId(conversation.id)
    setMessages(conversation.messages)
    setPayors(memory.payor || '')
    setPlanTypes(memory.planType || '')
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

  const renameConversation = (conversationId, title) => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, title: trimmedTitle }
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

  const deleteConversation = async (conversationId) => {
    await deleteChat(conversationId)
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

  const appendAssistantMessage = (conversationId, assistantMessage, rankSessionId, scopePatch) => {
    if (activeConversationRef.current === conversationId) {
      setMessages((current) => [...current, assistantMessage])
      setIsThinking(false)
      if (scopePatch?.payor) setPayors(scopePatch.payor)
      if (scopePatch?.planType) setPlanTypes(scopePatch.planType)
    }
    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.id !== conversationId) return conversation
        const scopeMemory = {
          ...(conversation.scopeMemory || {}),
          ...(scopePatch?.payor ? { payor: scopePatch.payor } : {}),
          ...(scopePatch?.planType ? { planType: scopePatch.planType } : {}),
          ...(scopePatch?.county ? { county: scopePatch.county } : {}),
        }
        return {
          ...conversation,
          messages: [...conversation.messages, assistantMessage],
          ...(rankSessionId ? { rankSessionId } : {}),
          scopeMemory,
        }
      }),
    )
  }

  const sendMessage = (content = draft, options = {}) => {
    const text = String(content || '').trim()
    if (!text || isLoading) return
    if (isThinking && !options.continue) return

    const payorsText = options.payorsText ?? payors
    const planTypesText = options.planTypesText ?? planTypes
    const silent = Boolean(options.silent)
    const userMessage = { role: 'user', content: text }
    const conversationId = silent
      ? (activeId ?? activeConversationRef.current)
      : (activeId ?? crypto.randomUUID())
    if (!conversationId) return
    const currentConversation = conversations.find(
      (conversation) => conversation.id === conversationId,
    )
    const priorMessages = currentConversation?.messages ?? messages
    const memory = scopeFromHistory(priorMessages, currentConversation?.scopeMemory)
    const resolved = resolveScope({ payorText: payorsText, planTypeText: planTypesText, question: text, memory })
    const updatedMessages = silent
      ? priorMessages
      : [...priorMessages, userMessage]
    const lastAssistant = [...updatedMessages].reverse().find((message) => message.role === 'assistant')
    // Write requests and rule overrides go straight to the service, which answers them without a payor.
    const blocked = isBlockedQuestion(text)
    const route = blocked ? 'ask' : routeMessage(
      text,
      silent ? undefined : lastAssistant?.meta?.kind,
      resolved,
      silent ? undefined : lastAssistant?.meta?.source,
    )
    // Earlier turns only; the current question goes in `question`.
    const history = conversationHistory(updatedMessages, text)
    const isFollowUp = !silent && priorMessages.some((message) => (
      message.role === 'assistant'
      && (message.meta?.source === 'ask' || message.meta?.source === 'rank')
      && message.meta?.kind !== 'clarify'
    ))
    const listing = listsRankedPayors(text)
    const scope = { payors: resolved.payors, payorsCrossPlanTypes: resolved.payorsCrossPlanTypes }
    const scopeProblem = route === 'chat' || listing ? '' : scopeError(scope)
    const lengthError = route !== 'chat' && text.length > 500
      ? 'Network questions must be 500 characters or fewer.'
      : ''
    const needsSuggestion = route === 'rank' && Boolean(scopeProblem) && !lengthError && !scopeProblem.startsWith('Each ')

    const rememberedScope = {
      ...(memory.payor ? { payor: memory.payor } : {}),
      ...(memory.planType ? { planType: memory.planType } : {}),
      ...(memory.county ? { county: memory.county } : {}),
      ...(resolved.payor ? { payor: resolved.payor } : {}),
      ...(resolved.planType ? { planType: resolved.planType } : {}),
      ...(resolved.county ? { county: resolved.county } : {}),
    }
    if (resolved.payor && resolved.payor !== payors) setPayors(resolved.payor)
    if (resolved.planType && resolved.planType !== planTypes) setPlanTypes(resolved.planType)

    activeConversationRef.current = conversationId
    setActiveId(conversationId)
    if (!silent) {
      setMessages(updatedMessages)
      setDraft('')
    }
    setIsThinking(true)
    setConversations((current) => {
      const exists = current.some((conversation) => conversation.id === conversationId)
      if (exists) {
        return current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                updated: 'Just now',
                messages: silent ? conversation.messages : updatedMessages,
                scopeMemory: { ...conversation.scopeMemory, ...rememberedScope },
              }
            : conversation,
        )
      }

      return [
        {
          id: conversationId,
          title: createConversationTitle(text),
          updated: 'Just now',
          messages: updatedMessages,
          rankSessionId: currentConversation?.rankSessionId,
          scopeMemory: rememberedScope,
        },
        ...current,
      ]
    })

    if (lengthError || (route === 'rank' && scopeProblem && !needsSuggestion)) {
      appendAssistantMessage(conversationId, { role: 'assistant', content: lengthError || scopeProblem })
      return
    }

    const sendResolvedRequest = (scopeOverride, countyName) => {
      const requestScope = scopeOverride || scope
      const county = responseCounty({
        question: text,
        memoryCounty: resolved.county,
        optionsCounty: countyName,
      })
      const context = county ? { county, state: 'TX' } : undefined
      const earlier = priorMessages
        .filter((message) => message.role === 'user')
        .map((message) => message.content)
        .join('\n')
      const request = route === 'ask'
        ? askQuestion({
            question: text,
            ...requestScope,
            ...(options.payorConfirmed ? { payorConfirmed: true } : {}),
            ...(context ? { context } : {}),
            ...(history.length ? { history } : {}),
          })
        : route === 'rank'
          ? rankQuestion({
              message: text,
              question: text,
              earlier,
              messages: chatTranscript([...history, { role: 'user', content: text }]),
              ...requestScope,
              // A payor picked from the service's options: answer for it even if the question named another.
              ...(options.payorConfirmed ? { payorConfirmed: true } : {}),
              ...(context ? { context, county } : {}),
              ...(currentConversation?.rankSessionId ? { sessionId: currentConversation.rankSessionId } : {}),
            })
          : sendChat(chatTranscript(updatedMessages))

      request
        .then((data) => {
          const reply = assistantFromApi(data)
          if (reply.message.meta) reply.message.meta.source = route
          else reply.message.meta = { source: route }
          appendAssistantMessage(conversationId, reply.message, reply.rankSessionId, {
            payor: reply.message.meta?.payor || resolved.payor,
            planType: reply.message.meta?.planType || resolved.planType,
            county: reply.message.meta?.county || county || resolved.county,
          })
        })
        .catch((error) => {
          const content = error instanceof Error ? error.message : 'The network service request failed.'
          appendAssistantMessage(conversationId, { role: 'assistant', content, meta: { source: route } })
        })
    }

    if (blocked && !lengthError) {
      sendResolvedRequest({ payors: [], payorsCrossPlanTypes: [] })
      return
    }

    const pipelineReply = !silent
      && lastAssistant?.meta?.fromService
      && ['clarify', 'confirm', 'needs_data'].includes(lastAssistant.meta.kind)
    const continuingTable = !silent
      && (lastAssistant?.meta?.source === 'ask' || lastAssistant?.meta?.source === 'rank')
      && isTableFollowUp(text)
      && /\bcolumns?\b|\bsort(?:ed)?\s+by\b|\border\s+by\b/i.test(text)
    if (!lengthError && (pipelineReply || continuingTable)) {
      sendResolvedRequest()
      return
    }

    if (route === 'ask' && !lengthError) {
      fetchRankOptions({ q: text, county: resolved.county })
        .then((rankChoices) => {
          const named = payorsNamedInQuestion(text, rankChoices.payors)
          const namedType = planTypeNamedInQuestion(text, rankChoices.planTypes)
          const payorList = named.length
            ? named
            : ((options.payorConfirmed || isFollowUp) && resolved.payor ? [resolved.payor] : [])
          const types = namedType
            ? [namedType]
            : (resolved.planType ? [resolved.planType] : (rankChoices.planTypes?.length ? rankChoices.planTypes : ['HMO', 'PPO']))
          if (!payorList.length) {
            const suggestion = scopeSuggestion({
              payorsText: '',
              planTypesText: resolved.planType,
              options: rankChoices,
              requirePlanType: false,
            })
            appendAssistantMessage(conversationId, {
              role: 'assistant',
              content: suggestion?.content || 'Which payor should I use?',
              meta: {
                source: route,
                kind: 'clarify',
                suggestions: suggestion?.suggestions || [],
                suggestionField: suggestion?.suggestionField || 'payor',
                ...(rankChoices?.county ? { county: rankChoices.county } : {}),
              },
            }, undefined, { county: rankChoices?.county || resolved.county })
            return
          }
          sendResolvedRequest({
            payors: payorList,
            payorsCrossPlanTypes: payorList.flatMap((payor) => types.map((planType) => ({ payor, planType }))),
          }, rankChoices.county)
        })
        .catch((error) => {
          const content = error instanceof Error ? error.message : 'Rank options are unavailable.'
          appendAssistantMessage(conversationId, { role: 'assistant', content, meta: { source: route } })
        })
      return
    }

    if (!needsSuggestion && !silent && !options.detected && route === 'rank' && !lengthError) {
      fetchRankOptions({ q: text, county: resolved.county })
        .then((rankChoices) => {
          if (listing) {
            const typeInQuestion = planTypeNamedInQuestion(text, rankChoices.planTypes)
            const types = typeInQuestion ? [typeInQuestion] : (rankChoices.planTypes?.length ? rankChoices.planTypes : ['HMO'])
            const payorList = rankChoices.payors?.length
              ? rankChoices.payors
              : (Array.isArray(resolved.payors) ? resolved.payors : [])
            if (!payorList.length) {
              appendAssistantMessage(conversationId, {
                role: 'assistant',
                content: 'No ranked payors are loaded for that county.',
                meta: { source: route, ...(rankChoices?.county ? { county: rankChoices.county } : {}) },
              })
              return
            }
            sendResolvedRequest({
              payors: payorList,
              payorsCrossPlanTypes: payorList.flatMap((payor) => types.map((planType) => ({ payor, planType }))),
            }, rankChoices.county)
            return
          }
          const namedPayor = payorNamedInQuestion(text, rankChoices.payors)
          const namedType = planTypeNamedInQuestion(text, rankChoices.planTypes)
          if ((namedPayor && namedPayor !== resolved.payor) || (namedType && namedType !== resolved.planType)) {
            sendMessage(text, {
              payorsText: namedPayor || resolved.payor,
              planTypesText: namedType || resolved.planType,
              silent: true,
              continue: true,
              detected: true,
            })
            return
          }
          sendResolvedRequest(undefined, rankChoices.county)
        })
        .catch((error) => {
          const content = error instanceof Error ? error.message : 'Rank options are unavailable.'
          appendAssistantMessage(conversationId, { role: 'assistant', content, meta: { source: route } })
        })
      return
    }

    if (needsSuggestion) {
      fetchRankOptions({ q: text, county: resolved.county })
        .then((rankChoices) => {
          const namedPayor = resolved.payor || payorNamedInQuestion(text, rankChoices.payors)
          const namedType = resolved.planType || planTypeNamedInQuestion(text, rankChoices.planTypes)
          if (namedPayor !== resolved.payor || namedType !== resolved.planType) {
            sendMessage(text, {
              payorsText: namedPayor,
              planTypesText: namedType,
              silent: true,
              continue: true,
            })
            return null
          }
          if (!namedType) return rankChoices
          return fetchRankOptions({ q: text, county: resolved.county || rankChoices.county, planType: namedType })
        })
        .then((rankChoices) => {
          if (!rankChoices) return
          const suggestion = scopeSuggestion({
            payorsText: resolved.payor,
            planTypesText: resolved.planType,
            options: rankChoices,
          })
          if (!suggestion) return
          appendAssistantMessage(conversationId, {
            role: 'assistant',
            content: suggestion?.content || 'Choose a plan type and payor.',
            meta: {
              source: route,
              kind: 'clarify',
              suggestions: suggestion?.suggestions || [],
              suggestionField: suggestion?.suggestionField || '',
              ...(rankChoices?.county ? { county: rankChoices.county } : {}),
            },
          }, undefined, {
            payor: resolved.payor,
            planType: resolved.planType,
            county: rankChoices?.county || resolved.county,
          })
        })
        .catch((error) => {
          const content = error instanceof Error ? error.message : 'Rank options are unavailable.'
          appendAssistantMessage(conversationId, { role: 'assistant', content, meta: { source: route } })
        })
      return
    }

    sendResolvedRequest()
  }

  return {
    activeId,
    conversations,
    deleteConversation,
    draft,
    apiStatus,
    isThinking,
    isLoading,
    messages,
    payors,
    planTypes,
    openConversation,
    reorderConversation,
    renameConversation,
    applySuggestion: (field, value) => {
      // A suggested question is sent as a new message, not as a payor or plan type choice.
      if (field === 'question') {
        sendMessage(value)
        return
      }
      const nextPayors = field === 'payor' ? value : payors
      const nextPlanTypes = field === 'planType' ? value : planTypes
      if (field === 'payor') setPayors(value)
      else if (field === 'planType') setPlanTypes(value)
      const lastUser = [...messages].reverse().find((message) => message.role === 'user')
      if (!lastUser) return
      sendMessage(lastUser.content, {
        payorsText: nextPayors,
        planTypesText: nextPlanTypes,
        silent: true,
        payorConfirmed: field === 'payor' || Boolean(nextPayors),
      })
    },
    sendMessage,
    setDraft,
    setPayors,
    setPlanTypes,
    startNewChat,
    storageError,
    toggleArchivedConversation,
    togglePinnedConversation,
  }
}
