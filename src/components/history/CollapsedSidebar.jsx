import { History, PanelLeftOpen, Plus, Search } from 'lucide-react'

function CollapsedSidebar({ onExpand, onNewChat }) {
  return (
    <nav aria-label="Conversation sidebar" className="portal-collapsed-sidebar">
      <div aria-hidden="true" className="portal-collapsed-brand">
        <span className="brand-mark">
          <img alt="" className="brand-logo" src="/chatBotIcon.png" />
        </span>
      </div>
      <button
        aria-label="Expand conversation history"
        className="portal-rail-action"
        onClick={onExpand}
        title="Expand sidebar"
        type="button"
      >
        <PanelLeftOpen size={18} />
      </button>
      <button
        aria-label="Start a new chat"
        className="portal-rail-action"
        onClick={onNewChat}
        title="New chat"
        type="button"
      >
        <Plus size={19} />
      </button>
      <button
        aria-label="Search chats"
        className="portal-rail-action"
        onClick={onExpand}
        title="Search chats"
        type="button"
      >
        <Search size={18} />
      </button>
      <button
        aria-label="Show conversation history"
        className="portal-rail-action"
        onClick={onExpand}
        title="Conversation history"
        type="button"
      >
        <History size={18} />
      </button>
    </nav>
  )
}

export default CollapsedSidebar
