import MessageList from '@/components/chat/MessageList'
import WelcomeScreen from '@/components/chat/WelcomeScreen'

function ChatPanel({ activeId, isThinking, messages, onApplySuggestion, onPromptSelect }) {
  if (messages.length === 0) {
    return <WelcomeScreen onPromptSelect={onPromptSelect} />
  }

  return (
    <MessageList
      activeId={activeId}
      isThinking={isThinking}
      messages={messages}
      onApplySuggestion={onApplySuggestion}
    />
  )
}

export default ChatPanel
