import { Search } from 'lucide-react'

function ConversationSearch({ onChange, value }) {
  return (
    <label className="history-search">
      <Search size={16} />
      <input
        aria-label="Search chats"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search chats..."
        value={value}
      />
    </label>
  )
}

export default ConversationSearch
