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
- `npm test` verifies IndexedDB initialization, persistence, ordering, and deletion using an in-memory IndexedDB implementation.

## UI stack

- React and Vite
- Tailwind CSS v4
- shadcn/ui components
- Lucide icons

The chat currently uses local demo replies; connect an AI service to enable live model responses.

## Local storage

Chat history is saved in the browser's IndexedDB database `geniechat` (version 1), with two object stores:

- `User`: `id` (primary key), `name`, `createdAt`. The app creates one local user (`local-user`); there is no authentication flow.
- `Chat`: `id` (primary key), `userId` (indexed), `position`, plus the existing conversation fields (`title`, `updated`, `messages`, optional `pinned` and `archived`). Messages remain embedded in each chat.

Sample conversations are added only when the local user is first created. Messages, pin/archive changes, deletions, and ordering survive refresh, including an empty history after deleting all chats. Data is specific to this browser and site origin; clearing site data removes it. Storage failures display a warning and leave the chat usable in memory. Concurrent tabs can overwrite each other's history; use one tab for editing.

## Project structure

- `src/App.jsx` composes the sidebar, chat panel, and composer.
- `src/hooks/useChat.js` owns conversation selection, message sending, and history actions.
- `src/data/starterConversations.js` contains the sample history shown at startup.
- `src/lib/chat.js` contains chat title and demo reply helpers.
- `src/lib/db.js` creates the IndexedDB stores and loads/saves local chat history.
- `src/components/chat/` contains the welcome screen, message list, chat panel, and composer.
- `src/components/history/` contains the sidebar, collapsed icon rail, search, conversation list/items, and action menu.
