import { useEffect, useRef, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pin,
  Trash2,
} from 'lucide-react'

function ConversationActionsMenu({ conversation, onArchive, onDelete, onPin }) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('click', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('click', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const toggleMenu = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const menuHeight = 108
    const menuWidth = 166
    const top = bounds.bottom + menuHeight <= window.innerHeight
      ? bounds.bottom
      : Math.max(8, bounds.top - menuHeight)
    const left = Math.max(8, Math.min(bounds.right - menuWidth, window.innerWidth - menuWidth - 8))
    setPosition({ top, left })
    setIsOpen((open) => !open)
  }

  const confirmDelete = () => {
    if (window.confirm(`Delete "${conversation.title}"? This can't be undone.`)) {
      onDelete(conversation.id)
    }
    setIsOpen(false)
  }

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-label={`Options for ${conversation.title}`}
        className="icon-button history-item-menu-trigger"
        onClick={toggleMenu}
        ref={triggerRef}
        type="button"
      >
        <MoreHorizontal size={16} />
      </button>
      {isOpen && (
        <div className="history-item-menu" ref={menuRef} role="menu" style={position}>
          <button onClick={() => { onPin(conversation.id); setIsOpen(false) }} role="menuitem" type="button">
            <Pin size={14} />
            {conversation.pinned ? 'Unpin chat' : 'Pin chat'}
          </button>
          <button onClick={() => { onArchive(conversation.id); setIsOpen(false) }} role="menuitem" type="button">
            {conversation.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
            {conversation.archived ? 'Restore chat' : 'Archive chat'}
          </button>
          <button className="history-delete-action" onClick={confirmDelete} role="menuitem" type="button">
            <Trash2 size={14} />
            Delete chat
          </button>
        </div>
      )}
    </>
  )
}

export default ConversationActionsMenu
