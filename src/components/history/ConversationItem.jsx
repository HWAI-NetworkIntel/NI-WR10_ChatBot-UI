import { GripVertical, Pin } from 'lucide-react'
import ConversationActionsMenu from '@/components/history/ConversationActionsMenu'

function ConversationItem({
  activeId,
  conversation,
  groupKey,
  nextId,
  onArchive,
  onDelete,
  onOpen,
  onPin,
  onReorder,
  previousId,
}) {
  const handleDrop = (event) => {
    event.preventDefault()
    event.currentTarget.classList.remove('is-drop-target')

    const sourceId = event.dataTransfer.getData('text/plain')
    const sourceGroup = event.dataTransfer.getData('application/x-geniechat-group')
    if (!sourceId || sourceGroup !== groupKey || sourceId === conversation.id) return

    const bounds = event.currentTarget.getBoundingClientRect()
    const position = event.clientY > bounds.top + bounds.height / 2 ? 'after' : 'before'
    onReorder(sourceId, conversation.id, position)
  }

  return (
    <div
      className="history-item-row"
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        event.currentTarget.classList.add('is-drop-target')
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          event.currentTarget.classList.remove('is-drop-target')
        }
      }}
      onDrop={handleDrop}
    >
      <button
        aria-label={`Drag ${conversation.title} to reorder`}
        aria-keyshortcuts="ArrowUp ArrowDown"
        className="icon-button history-drag-handle"
        draggable="true"
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' && previousId) {
            event.preventDefault()
            onReorder(conversation.id, previousId, 'before')
          } else if (event.key === 'ArrowDown' && nextId) {
            event.preventDefault()
            onReorder(conversation.id, nextId, 'after')
          }
        }}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', conversation.id)
          event.dataTransfer.setData('application/x-geniechat-group', groupKey)
        }}
        type="button"
      >
        <GripVertical size={15} />
      </button>
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
        {conversation.pinned && <Pin className="history-pinned-icon" size={13} />}
      </button>
      <ConversationActionsMenu
        conversation={conversation}
        onArchive={onArchive}
        onDelete={onDelete}
        onPin={onPin}
      />
    </div>
  )
}

export default ConversationItem
