import { Menu } from '@base-ui/react/menu'
import { MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'

function ConversationItem({ activeId, conversation, onOpen, onDelete, onRename, onTogglePinned }) {
  return (
    <div className="history-item-row">
      <button
        className={`history-item portal-history-item ${activeId === conversation.id ? 'is-active' : ''}`}
        onClick={() => onOpen(conversation)}
        title={conversation.title}
        type="button"
      >
        <span className="portal-history-copy">
          <span>{conversation.title}</span>
          <small>Last message {conversation.updated || 'Just now'}</small>
        </span>
      </button>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Options for ${conversation.title}`}
          className="icon-button history-item-menu-trigger"
        >
          <MoreHorizontal size={18} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start" side="bottom" sideOffset={4} className="history-menu-positioner">
            <Menu.Popup className="history-item-menu">
              <Menu.Item onClick={() => onTogglePinned(conversation.id)}>
                {conversation.pinned ? <PinOff size={18} /> : <Pin size={18} />}
                {conversation.pinned ? 'Unpin' : 'Pin'}
              </Menu.Item>
              <Menu.Item onClick={() => onRename(conversation)}>
                <Pencil size={18} /> Rename
              </Menu.Item>
              <Menu.Item className="history-delete-action" onClick={() => onDelete(conversation)}>
                <Trash2 size={18} /> Delete
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}

export default ConversationItem
