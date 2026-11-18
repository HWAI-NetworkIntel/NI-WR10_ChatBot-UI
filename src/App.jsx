import { useRef, useState } from 'react'
import ChatComposer from '@/components/chat/ChatComposer'
import ChatPanel from '@/components/chat/ChatPanel'
import HistorySidebar from '@/components/history/HistorySidebar'
import { useChat } from '@/hooks/useChat'

function App() {
  const chat = useChat()
  const inputRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sidebarWidth, setSidebarWidth] = useState(250)
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
        onExpand={() => setSidebarCollapsed(false)}
        onNewChat={startNewChat}
        onOpenConversation={chat.openConversation}
        onResize={setSidebarWidth}
        onResizingChange={setIsResizingSidebar}
        onSearchChange={setSearchTerm}
        searchTerm={searchTerm}
        sidebarWidth={sidebarWidth}
      />

      <main className="portal-main">
        {chat.isLoading && <p role="status">Loading chat history…</p>}
        {chat.storageError && <p role="alert">{chat.storageError}</p>}
        <div className={`portal-conversation ${chat.messages.length === 0 ? 'portal-empty' : ''}`}>
          <ChatPanel
            activeId={chat.activeId}
            isThinking={chat.isThinking}
            messages={chat.messages}
            onPromptSelect={chat.sendMessage}
          />
          <ChatComposer
            draft={chat.draft}
            inputRef={inputRef}
            isThinking={chat.isThinking || chat.isLoading}
            onDraftChange={chat.setDraft}
            onPromptSelect={chat.messages.length === 0 ? chat.sendMessage : undefined}
            onSend={chat.sendMessage}
          />
        </div>
      </main>
    </div>
  )
}

export default App
