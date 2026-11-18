function ConversationItem({ activeId, conversation, onOpen }) {
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
    </div>
  )
}

export default ConversationItem
