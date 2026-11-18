import { ArrowUp, ExternalLink, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const suggestedPrompts = [
  'How many providers does Humana have in Dallas County, Texas?',
  'Compare Humana and UnitedHealthcare cardiologists in Harris County',
  'Where does Humana rank in Dallas County?',
]

function ChatComposer({
  draft,
  inputRef,
  isThinking,
  onDraftChange,
  onPromptSelect,
  onSend,
}) {
  const handleSubmit = (event) => {
    event.preventDefault()
    onSend()
  }

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSend()
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
              <Sparkles size={16} />
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
          aria-label="Send message"
          className="portal-send-button"
          disabled={!draft.trim() || isThinking}
          size="icon"
          type="submit"
          variant="default"
        >
          <ArrowUp size={18} />
        </Button>
      </form>
      <div className="portal-composer-meta">
        <button type="button">Pre-Read <ExternalLink size={12} /></button>
      </div>
    </footer>
  )
}

export default ChatComposer
