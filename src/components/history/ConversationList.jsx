import { useState } from 'react'
import ConversationItem from '@/components/history/ConversationItem'
import ConversationActionDialog from '@/components/history/ConversationActionDialog'

function ConversationList({
  activeId,
  conversations,
  emptyMessage = 'No conversations found.',
  onOpen,
  onDelete,
  onRename,
  onTogglePinned,
}) {
  const [action, setAction] = useState(null)

  if (conversations.length === 0) {
    return <p className="empty-search">{emptyMessage}</p>
  }

  return (
    <>
      {conversations.map((conversation) => (
        <ConversationItem
          activeId={activeId}
          conversation={conversation}
          key={conversation.id}
          onOpen={onOpen}
          onTogglePinned={onTogglePinned}
          onRename={(conversation) => {
            setAction({ type: 'rename', conversation })
          }}
          onDelete={(conversation) => setAction({ type: 'delete', conversation })}
        />
      ))}
      {action && (
        <ConversationActionDialog
          action={action}
          onClose={() => setAction(null)}
          onDelete={onDelete}
          onRename={onRename}
        />
      )}
    </>
  )
}

export default ConversationList
