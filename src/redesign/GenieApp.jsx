import { useEffect, useRef, useState } from 'react'
import {
  ArrowUp, Check, Copy, ExternalLink, PanelLeftClose, PanelLeftOpen, Plus, RotateCcw, Search, Sparkles, Square,
} from 'lucide-react'
import ConversationList from '@/components/history/ConversationList'
import { useChat } from '@/hooks/useChat'
import RankCard from '@/redesign/RankCard'
import { AnswerDetails, DataTable, GuideLinks, RichText, SuggestionChoices } from '@/redesign/AnswerBlocks'
import preReadPdf from '../../docs/NI_GenieAI.pdf?url'
import './genie-redesign.css'

const STARTER_PROMPTS = [
  'Where does Humana rank in Dallas County?',
  'What happens if HCA gets dropped from UnitedHealth Group, Inc., Texas?',
  'Where do we rank in Harris County for PPO?',
]

const THINKING_MESSAGES = ['Looking for data', 'Analyzing data', 'Preparing response']

function ThinkingIndicator() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIndex((current) => (current + 1) % THINKING_MESSAGES.length), 2000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="gx-ai">
      <div className="gx-avatar-ai"><Sparkles size={16} /></div>
      <div className="gx-thinking" role="status">
        <span className="gx-dots" aria-hidden="true"><i /><i /><i /></span>
        {THINKING_MESSAGES[index]}…
      </div>
    </div>
  )
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return undefined
    const id = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(id)
  }, [copied])
  return (
    <button
      aria-label={copied ? 'Copied' : label}
      className="gx-icon-btn"
      onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => {})}
      title={label}
      type="button"
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  )
}

function ScopeLine({ meta }) {
  const items = [
    meta?.county && ['County', meta.county],
    meta?.planType && ['Plan type', meta.planType],
    meta?.payor && ['Payor', meta.payor],
  ].filter(Boolean)
  if (!items.length) return null
  return (
    <div className="gx-scope">
      <Check aria-hidden="true" size={14} className="gx-scope__check" />
      <span>Scoped to</span>
      {items.map(([label, value]) => <span className="gx-pill" key={label}>{label}: {value}</span>)}
    </div>
  )
}

function AssistantMessage({ isLast, isThinking, message, onApplySuggestion, onRegenerate }) {
  const meta = message.meta || {}
  const hasTable = Boolean(meta.columns?.length && meta.rows?.length)
  const focal = meta.standings?.find((row) => row.focal)
  const actions = (
    <div className="gx-row gx-row--tight">
      {message.content && <CopyButton text={message.content} label="Copy answer" />}
      {onRegenerate && (
        <button aria-label="Regenerate" className="gx-icon-btn" disabled={isThinking} onClick={onRegenerate} title="Regenerate" type="button">
          <RotateCcw size={15} />
        </button>
      )}
    </div>
  )

  return (
    <div className="gx-ai">
      <div className="gx-avatar-ai"><Sparkles size={16} /></div>
      <div className="gx-ai__body">
        <ScopeLine meta={meta} />
        {focal ? (
          <RankCard actions={actions} content={message.content} hasTable={hasTable} meta={meta} />
        ) : (
          <>
            <RichText text={message.content} />
            {meta.standings?.length > 0 && !hasTable && (
              <DataTable columns={['Rank', 'Payor']} rows={meta.standings.map((row) => [row.rank, row.payor])} />
            )}
          </>
        )}
        <DataTable columns={meta.columns} rowLimitHit={meta.rowLimitHit} rows={meta.rows} />
        {meta.tables?.map((table, index) => (
          <DataTable columns={table.columns} key={`${table.title}-${index}`} rows={table.rows} title={table.title} />
        ))}
        <SuggestionChoices
          active={!isThinking && isLast}
          field={meta.suggestionField}
          onSelect={onApplySuggestion}
          suggestions={meta.suggestions}
        />
        <GuideLinks links={meta.links} />
        <AnswerDetails meta={meta} />
        {!focal && message.content && actions}
      </div>
    </div>
  )
}

function GenieApp() {
  const chat = useChat()
  const inputRef = useRef(null)
  const endRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, chat.isThinking])

  const conversations = chat.conversations
    .filter((conversation) => !conversation.archived)
    .filter((conversation) => conversation.title.toLowerCase().includes(searchTerm.toLowerCase()))
  const pinned = conversations.filter((conversation) => conversation.pinned)
  const recent = conversations.filter((conversation) => !conversation.pinned)
  const active = chat.conversations.find((conversation) => conversation.id === chat.activeId)
  const scope = active?.scopeMemory || {}
  const headerChips = [
    scope.county && 'Texas',
    scope.county,
    scope.planType || chat.planTypes,
    scope.payor || chat.payors,
  ].filter(Boolean)

  const startNewChat = () => {
    chat.startNewChat()
    inputRef.current?.focus()
  }

  const submit = (event) => {
    event?.preventDefault()
    if (!chat.isThinking && !chat.isLoading) chat.sendMessage()
  }

  const isEmpty = chat.messages.length === 0

  return (
    <div className="gx">
      {/* Sidebar */}
      {collapsed ? (
        <nav aria-label="Conversation sidebar" className="gx-rail">
          <img alt="" className="gx-logo-img" src="/chatBotIcon.png" />
          <button aria-label="Expand sidebar" className="gx-icon-btn gx-icon-btn--lg" onClick={() => setCollapsed(false)} type="button"><PanelLeftOpen size={18} /></button>
          <button aria-label="New chat" className="gx-icon-btn gx-icon-btn--lg" onClick={startNewChat} type="button"><Plus size={18} /></button>
          <button aria-label="Search chats" className="gx-icon-btn gx-icon-btn--lg" onClick={() => setCollapsed(false)} type="button"><Search size={18} /></button>
        </nav>
      ) : (
        <aside className="gx-side">
          <div className="gx-side__brand">
            <button aria-label="GenieAI home" className="gx-brand" onClick={startNewChat} type="button">
              <img alt="" className="gx-logo-img" src="/chatBotIcon.png" />
              <span className="gx-stack gx-stack--0">
                <span className="gx-brand__name">NI GenieAI</span>
                <span className="gx-small">Network Intelligence</span>
              </span>
            </button>
            <button aria-label="Collapse sidebar" className="gx-icon-btn gx-icon-btn--lg" onClick={() => setCollapsed(true)} type="button">
              <PanelLeftClose size={18} />
            </button>
          </div>

          <button className="gx-btn gx-btn--dark gx-btn--block" onClick={startNewChat} type="button">
            <Plus size={16} /> New chat
          </button>

          <label className="gx-search">
            <Search size={15} />
            <input aria-label="Search chats" onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search chats" value={searchTerm} />
          </label>

          <nav aria-label="Conversation history" className="gx-history">
            <section className="gx-stack">
              <h2 className="gx-eyebrow gx-pad">Pinned</h2>
              <ConversationList
                activeId={chat.activeId}
                conversations={pinned}
                emptyMessage="Pin a chat to keep it here."
                onDelete={chat.deleteConversation}
                onOpen={chat.openConversation}
                onRename={chat.renameConversation}
                onTogglePinned={chat.togglePinnedConversation}
              />
            </section>
            <section className="gx-stack">
              <h2 className="gx-eyebrow gx-pad">Recent</h2>
              <ConversationList
                activeId={chat.activeId}
                conversations={recent}
                emptyMessage="No recent chats."
                onDelete={chat.deleteConversation}
                onOpen={chat.openConversation}
                onRename={chat.renameConversation}
                onTogglePinned={chat.togglePinnedConversation}
              />
            </section>
          </nav>

          <a className="gx-classic-link" href="?ui=classic">Switch to classic view</a>
        </aside>
      )}

      {/* Main */}
      <main className="gx-main">
        {!isEmpty && (
          <header className="gx-header">
            <div className="gx-stack">
              <h1 className="gx-title">{active?.title || 'New chat'}</h1>
              {headerChips.length > 0 && (
                <div className="gx-chips">
                  {headerChips.map((chip) => <span className="gx-tag" key={chip}>{chip}</span>)}
                </div>
              )}
            </div>
            {active && (
              <button className="gx-btn gx-btn--ghost" onClick={() => chat.togglePinnedConversation(active.id)} type="button">
                {active.pinned ? 'Unpin' : 'Pin'}
              </button>
            )}
          </header>
        )}

        {(chat.storageError || chat.apiStatus) && (
          <div className="gx-banner" role="status">{chat.storageError || chat.apiStatus}</div>
        )}

        <section aria-label="Chat messages" className="gx-thread">
          <div className="gx-col">
            {chat.isLoading && <p className="gx-small" role="status">Loading chat history…</p>}

            {isEmpty && !chat.isLoading && (
              <div className="gx-welcome">
                <div className="gx-welcome__mark"><Sparkles size={26} /></div>
                <h1>How can I help with your network today?</h1>
                <p>Ask about payor rankings, provider networks, or what happens if a network changes.</p>
                <div className="gx-welcome__grid">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button className="gx-starter" key={prompt} onClick={() => chat.sendMessage(prompt)} type="button">
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chat.messages.map((message, index) => (message.role === 'user' ? (
              <div className="gx-user" key={`${chat.activeId}-${index}`}>
                <div className="gx-user__bubble">{message.content}</div>
                <div className="gx-row gx-row--tight gx-user__actions">
                  <CopyButton text={message.content} label="Copy message" />
                  <button aria-label="Resend" className="gx-icon-btn" disabled={chat.isThinking} onClick={() => chat.resendMessage(index, message.content)} title="Resend" type="button">
                    <RotateCcw size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <AssistantMessage
                isLast={index === chat.messages.length - 1}
                isThinking={chat.isThinking}
                key={`${chat.activeId}-${index}`}
                message={message}
                onApplySuggestion={chat.applySuggestion}
                onRegenerate={chat.messages[index - 1]?.role === 'user'
                  ? () => chat.resendMessage(index - 1, chat.messages[index - 1].content)
                  : undefined}
              />
            )))}
            {chat.isThinking && <ThinkingIndicator />}
            <div ref={endRef} />
          </div>
        </section>

        <footer className="gx-composer-wrap">
          <div className="gx-col gx-col--tight">
            <form className="gx-composer" onSubmit={submit}>
              <textarea
                aria-label="Message NI GenieAI"
                onChange={(event) => chat.setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) submit(event)
                }}
                placeholder="Ask about rank, disruption, or a what-if…"
                ref={inputRef}
                rows={1}
                value={chat.draft}
              />
              <div className="gx-composer__bar">
                <div className="gx-chips">
                  {headerChips.slice(1).map((chip) => <span className="gx-ctx" key={chip}>{chip}</span>)}
                </div>
                <button
                  aria-label={chat.isThinking ? 'Stop response' : 'Send message'}
                  className="gx-send"
                  disabled={chat.isLoading || (!chat.isThinking && !chat.draft.trim())}
                  onClick={chat.isThinking ? chat.stopResponse : undefined}
                  type={chat.isThinking ? 'button' : 'submit'}
                >
                  {chat.isThinking ? <Square fill="currentColor" size={16} /> : <ArrowUp size={18} />}
                </button>
              </div>
            </form>
            <div className="gx-disclaimer">
              <span>Answers use current network data. Verify before sharing externally.</span>
              <a href={preReadPdf} rel="noopener noreferrer" target="_blank">Pre-Read <ExternalLink size={12} /></a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default GenieApp
