import { useEffect, useRef } from 'react'
import { Clock3 } from 'lucide-react'

function ThinkingIndicator() {
  return (
    <div className="message-row thinking-row">
      <div className="thinking-indicator" aria-label="Genie is thinking">
        <span /><span /><span />
      </div>
    </div>
  )
}

function MessageList({ activeId, isThinking, messages }) {
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  return (
    <section aria-label="Chat messages" className="messages-panel">
      <div className="messages-inner">
        <div className="conversation-date"><span><Clock3 size={12} /> TODAY</span></div>
        {messages.map((message, index) => (
          <article
            className={`message-row ${message.role === 'user' ? 'user-message-row' : ''}`}
            key={`${activeId}-${index}`}
          >
            <div className="message-body">
              <p>{message.content}</p>
            </div>
          </article>
        ))}
        {isThinking && <ThinkingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </section>
  )
}

export default MessageList
