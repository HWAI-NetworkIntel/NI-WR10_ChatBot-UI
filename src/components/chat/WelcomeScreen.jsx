import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const suggestedPrompts = [
  'Which states offer the highest number of plans covering transport services for 2027?',
  'Which county offers the most C-SNP plans in 2027?',
  'Give me a plan summary for bid ID H0523-022-000.',
]

function WelcomeScreen({ onPromptSelect }) {
  return (
    <section className="welcome-panel">
      <div className="welcome-content">
        <h1>Hi Vibhoore! How can I help you today?</h1>
        <p className="welcome-subtitle">Ask about Plans, Benefits and Enrollment.</p>

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
      </div>
    </section>
  )
}

export default WelcomeScreen
