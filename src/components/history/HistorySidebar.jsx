import { useRef, useState } from 'react'
import { Archive, ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CollapsedSidebar from '@/components/history/CollapsedSidebar'
import ConversationList from '@/components/history/ConversationList'
import ConversationSearch from '@/components/history/ConversationSearch'
import SidebarHeader from '@/components/history/SidebarHeader'

function HistorySidebar({
  activeId,
  collapsed,
  conversations,
  onArchiveConversation,
  onClose,
  onDeleteConversation,
  onExpand,
  onNewChat,
  onOpenConversation,
  onPinConversation,
  onReorderConversation,
  onResize,
  onResizingChange,
  onSearchChange,
  searchTerm,
  sidebarWidth,
}) {
  const dragRef = useRef(null)
  const [showArchived, setShowArchived] = useState(false)
  const archivedConversations = conversations.filter((conversation) => conversation.archived)
  const activeConversations = conversations.filter((conversation) => !conversation.archived)

  const startResize = (event) => {
    if (window.matchMedia('(max-width: 760px)').matches) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: sidebarWidth,
    }
    onResizingChange(true)
  }

  const resize = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    onResize(Math.min(400, Math.max(220, dragRef.current.startWidth + event.clientX - dragRef.current.startX)))
  }

  const stopResize = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    onResizingChange(false)
  }

  const resizeWithKeyboard = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    onResize(Math.min(400, Math.max(220, sidebarWidth + (event.key === 'ArrowRight' ? 16 : -16))))
  }

  return (
    <aside
      className={`sidebar history-panel portal-sidebar ${collapsed ? 'is-collapsed' : ''}`}
      style={{ width: collapsed ? 56 : sidebarWidth, flexBasis: collapsed ? 56 : sidebarWidth }}
    >
      {collapsed ? (
        <CollapsedSidebar onExpand={onExpand} onNewChat={onNewChat} />
      ) : (
        <>
          <SidebarHeader onCollapse={onClose} onNewChat={onNewChat} />

          <Button className="new-chat-button" onClick={onNewChat} variant="outline">
            <span>New Chat</span>
            <Plus size={17} />
          </Button>

          <ConversationSearch onChange={onSearchChange} value={searchTerm} />

          <nav aria-label="Conversation history" className="conversation-history">
            <section className="history-group">
              <h2>Recent <ChevronDown size={13} /></h2>
              <ConversationList
                activeId={activeId}
                conversations={activeConversations}
                groupKey="Chats"
                onArchive={onArchiveConversation}
                onDelete={onDeleteConversation}
                onOpen={onOpenConversation}
                onPin={onPinConversation}
                onReorder={onReorderConversation}
              />
            </section>

            {archivedConversations.length > 0 && (
              <section className="archived-group">
                <button
                  aria-expanded={showArchived}
                  className="archived-toggle"
                  onClick={() => setShowArchived((show) => !show)}
                  type="button"
                >
                  <Archive size={14} />
                  <span>Archived</span>
                  <span className="archived-count">{archivedConversations.length}</span>
                  <ChevronDown className={showArchived ? 'is-expanded' : ''} size={14} />
                </button>
                {showArchived && (
                  <ConversationList
                    activeId={activeId}
                    conversations={archivedConversations}
                    groupKey="Archived"
                    onArchive={onArchiveConversation}
                    onDelete={onDeleteConversation}
                    onOpen={onOpenConversation}
                    onPin={onPinConversation}
                    onReorder={onReorderConversation}
                  />
                )}
              </section>
            )}
          </nav>

          <div
            aria-label="Resize conversation history panel"
            aria-orientation="vertical"
            aria-valuemax={400}
            aria-valuemin={220}
            aria-valuenow={sidebarWidth}
            className="sidebar-resize-handle"
            onKeyDown={resizeWithKeyboard}
            onLostPointerCapture={stopResize}
            onPointerCancel={stopResize}
            onPointerDown={startResize}
            onPointerMove={resize}
            onPointerUp={stopResize}
            role="separator"
            tabIndex={0}
          >
            <span />
          </div>
        </>
      )}
    </aside>
  )
}

export default HistorySidebar
