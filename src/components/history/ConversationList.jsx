import ConversationItem from '@/components/history/ConversationItem'

function ConversationList({
  activeId,
  conversations,
  groupKey = 'Recent',
  onArchive,
  onDelete,
  onOpen,
  onPin,
  onReorder,
}) {
  if (conversations.length === 0) {
    return <p className="empty-search">No conversations found.</p>
  }

  return conversations.map((conversation, index) => (
    <ConversationItem
      activeId={activeId}
      conversation={conversation}
      groupKey={groupKey}
      key={conversation.id}
      nextId={conversations[index + 1]?.id}
      onArchive={onArchive}
      onDelete={onDelete}
      onOpen={onOpen}
      onPin={onPin}
      onReorder={onReorder}
      previousId={conversations[index - 1]?.id}
    />
  ))
}

export default ConversationList
