export function createReply(prompt) {
  const topic = prompt.replace(/[?.!]+$/, '').trim()
  return `I can help with "${topic}". Tell me a little more about what you need, and I’ll guide you through the relevant plan, benefit, or enrollment information.`
}

export function createConversationTitle(prompt) {
  return prompt.length > 58 ? `${prompt.slice(0, 58)}…` : prompt
}
