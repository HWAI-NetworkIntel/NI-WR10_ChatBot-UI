import ConversationItem from '@/components/history/ConversationItem'

function ConversationList({
  activeId,
  conversations,
  onOpen,
}) {
  if (conversations.length === 0) {
    return <p className="empty-search">No conversations found.</p>
  }

  return conversations.map((conversation) => (
    <ConversationItem
      activeId={activeId}
      conversation={conversation}
      key={conversation.id}
      onOpen={onOpen}
    />
  ))
}

export default ConversationList
