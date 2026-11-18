# GenieAI

GenieAI is a responsive plans, benefits, and enrollment chat interface. It includes searchable conversation history, reorderable chats, pin and archive actions, delete confirmation, suggested prompts, and local demo replies.

## Run locally

```sh
npm install
npm run dev
```

## Scripts

- `npm run dev` starts the Vite development server.
- `npm run build` creates a production build in `dist`.
- `npm run preview` previews the production build.
- `npm run lint` runs Oxlint.

## UI stack

- React and Vite
- Tailwind CSS v4
- shadcn/ui components
- Lucide icons

The chat currently uses local demo replies; connect an AI service to enable live model responses.

## Project structure

- `src/App.jsx` composes the sidebar, chat panel, and composer.
- `src/hooks/useChat.js` owns conversation selection, message sending, and history actions.
- `src/data/starterConversations.js` contains the sample history shown at startup.
- `src/lib/chat.js` contains chat title and demo reply helpers.
- `src/components/chat/` contains the welcome screen, message list, chat panel, and composer.
- `src/components/history/` contains the sidebar, collapsed icon rail, search, conversation list/items, and action menu.
