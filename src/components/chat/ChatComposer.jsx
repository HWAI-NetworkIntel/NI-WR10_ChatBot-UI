import { ArrowUp, ExternalLink, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import preReadPdf from '../../../docs/NI_GenieAI.pdf?url'

const suggestedPrompts = [
  'What happens if HCA gets dropped from UnitedHealth Group, Inc., Texas?',
  'Where does Humana rank in Dallas County?',
]

function ChatComposer({
  draft,
  inputRef,
  isLoading,
  isThinking,
  onDraftChange,
  onPromptSelect,
  onSend,
  onStop,
}) {
  const handleSubmit = (event) => {
    event.preventDefault()
    if (!isThinking && !isLoading) onSend()
  }

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!isThinking && !isLoading) onSend()
    }
  }

  return (
    <footer className="composer-area portal-composer-area">
      {onPromptSelect && (
        <div aria-label="Suggested questions" className="suggestion-grid">
          {suggestedPrompts.map((prompt) => (
            <Button
              className="suggestion-card"
              key={prompt}
              onClick={() => onPromptSelect(prompt)}
              type="button"
            >
              <span>{prompt}</span>
            </Button>
          ))}
        </div>
      )}
      <form className="composer portal-composer" onSubmit={handleSubmit}>
        <textarea
          aria-label="Enter your text"
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Enter your text here"
          ref={inputRef}
          rows={1}
          value={draft}
        />
        <Button
          aria-label={isThinking ? 'Stop response' : 'Send message'}
          className="portal-send-button"
          disabled={isLoading || (!isThinking && !draft.trim())}
          onClick={isThinking ? onStop : undefined}
          size="icon"
          type={isThinking ? 'button' : 'submit'}
          variant="default"
        >
          {isThinking ? <Square size={18} fill="currentColor" /> : <ArrowUp size={18} />}
        </Button>
      </form>
      <div className="portal-composer-meta">
        <a href={preReadPdf} target="_blank" rel="noopener noreferrer">Pre-Read <ExternalLink size={12} /></a>
      </div>
    </footer>
  )
}

export default ChatComposer
