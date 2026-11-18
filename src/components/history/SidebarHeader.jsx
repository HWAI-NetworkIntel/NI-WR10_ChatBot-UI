import { PanelLeftClose, Sparkles } from 'lucide-react'

function SidebarHeader({ onCollapse, onNewChat }) {
  return (
    <div className="sidebar-top">
      <button aria-label="GenieAI home" className="brand" onClick={onNewChat} type="button">
        <span className="brand-mark">
          <Sparkles size={18} strokeWidth={2.2} />
        </span>
        <span className="brand-name">NI Genie<span>AI</span></span>
      </button>
      <button
        aria-label="Collapse conversation sidebar"
        className="icon-button sidebar-close"
        onClick={onCollapse}
        type="button"
      >
        <PanelLeftClose size={18} />
      </button>
    </div>
  )
}

export default SidebarHeader
