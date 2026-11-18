import { History, Plus, Search, Sparkles } from 'lucide-react'

function CollapsedSidebar({ onExpand, onNewChat }) {
  return (
    <nav aria-label="Conversation sidebar" className="portal-collapsed-sidebar">
      <button
        aria-label="Expand GenieAI sidebar"
        className="portal-collapsed-brand"
        onClick={onExpand}
        title="Expand sidebar"
        type="button"
      >
        <span className="brand-mark"><Sparkles size={18} strokeWidth={2.2} /></span>
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
