import MessageList from '@/components/chat/MessageList'
import WelcomeScreen from '@/components/chat/WelcomeScreen'

function ChatPanel({ activeId, isThinking, messages, onPromptSelect }) {
  if (messages.length === 0) {
    return <WelcomeScreen onPromptSelect={onPromptSelect} />
  }

  return (
    <MessageList
      activeId={activeId}
      isThinking={isThinking}
      messages={messages}
    />
  )
}

export default ChatPanel
