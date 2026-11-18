import { ArrowUp, ExternalLink, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ChatComposer({ draft, inputRef, isThinking, onDraftChange, onSend }) {
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
        <span>
          Updated with PBP 2027 · Enrollment till Oct 2026 · Data Coverage <Info size={12} />
        </span>
        <button type="button">Pre-Read <ExternalLink size={12} /></button>
      </div>
    </footer>
  )
}

export default ChatComposer
