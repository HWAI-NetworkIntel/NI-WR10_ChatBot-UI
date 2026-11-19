import { useRef, useState } from 'react'
import ChatComposer from '@/components/chat/ChatComposer'
import ChatPanel from '@/components/chat/ChatPanel'
import HistorySidebar from '@/components/history/HistorySidebar'
import { useChat } from '@/hooks/useChat'

function App() {
  const chat = useChat()
  const inputRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)

  const startNewChat = () => {
    chat.startNewChat()
    inputRef.current?.focus()
  }

  const visibleConversations = chat.conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className={`portal-shell ${isResizingSidebar ? 'sidebar-is-resizing' : ''}`}>
      <HistorySidebar
        activeId={chat.activeId}
        collapsed={sidebarCollapsed}
        conversations={visibleConversations}
        onClose={() => setSidebarCollapsed(true)}
        onDeleteConversation={chat.deleteConversation}
        onExpand={() => setSidebarCollapsed(false)}
        onNewChat={startNewChat}
        onOpenConversation={chat.openConversation}
        onRenameConversation={chat.renameConversation}
        onTogglePinnedConversation={chat.togglePinnedConversation}
        onResize={setSidebarWidth}
        onResizingChange={setIsResizingSidebar}
        onSearchChange={setSearchTerm}
        searchTerm={searchTerm}
        sidebarWidth={sidebarWidth}
      />

      <main className="portal-main">
        {chat.isLoading && <p role="status">Loading chat history…</p>}
        {chat.storageError && <p role="alert">{chat.storageError}</p>}
        {chat.apiStatus && <p className="portal-status" role="status">{chat.apiStatus}</p>}
        <div className={`portal-conversation ${chat.messages.length === 0 ? 'portal-empty' : ''}`}>
          <ChatPanel
            activeId={chat.activeId}
            isThinking={chat.isThinking}
            messages={chat.messages}
            onApplySuggestion={chat.applySuggestion}
            onResendMessage={chat.resendMessage}
            onPromptSelect={chat.sendMessage}
          />
          <ChatComposer
            draft={chat.draft}
            inputRef={inputRef}
            isLoading={chat.isLoading}
            isThinking={chat.isThinking}
            onDraftChange={chat.setDraft}
            onPromptSelect={chat.messages.length === 0 ? chat.sendMessage : undefined}
            onSend={chat.sendMessage}
            onStop={chat.stopResponse}
          />
        </div>
      </main>
    </div>
  )
}

export default App
