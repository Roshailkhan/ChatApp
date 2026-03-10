# Replit.md — AI Chat Application

## Overview

This is a **ChatGPT-style AI chat application** built with React Native (Expo) for the frontend and a Node.js/Express server for the backend. The app allows users to have streaming conversations with an AI, manage multiple conversations, and persist chat history.

Key features:
- Real-time streaming AI responses via Server-Sent Events (SSE)
- Multiple conversation management with rename/delete
- Local persistence using AsyncStorage
- Dark-themed UI with markdown rendering
- Cross-platform: iOS, Android, and Web (via Expo)
- PostgreSQL database (via Drizzle ORM) for server-side storage
- OpenAI integration through Replit AI Integrations

### Known Issues Fixed
- Tab layout used `SymbolView` (iOS-only) and `BlurView` (web hooks conflict with React Compiler) — replaced with `@expo/vector-icons` Ionicons and a simple background
- `Sidebar.tsx` was truncated mid-function — component completed with rename modal
- `index.tsx` was a placeholder — full chat screen integrated with all existing components
- `ChatProvider` was missing from root layout — added to `app/_layout.tsx`

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK ~54 with `expo-router` for file-based navigation
- **Navigation**: Tab-based layout under `app/(tabs)/`, stack navigation via `app/_layout.tsx`
- **State Management**: React Context (`contexts/ChatContext.tsx`) for conversations, messages, and settings; TanStack React Query for server state
- **Local Storage**: `@react-native-async-storage/async-storage` persists conversations and settings on-device
- **Streaming**: The frontend uses `fetch` with SSE to consume streaming responses from the `/api/chat` endpoint, updating message state incrementally
- **UI Components**:
  - `ChatInput` — text input with send/stop controls and haptic feedback
  - `MessageBubble` — renders messages with markdown support (`react-native-markdown-display`)
  - `TypingIndicator` — animated dots shown while AI is responding
  - `Sidebar` — swipeable conversation list with rename/delete actions
  - `ConversationItem` — individual conversation rows with swipe-to-reveal actions
- **Fonts**: Inter (400/500/600/700) via `@expo-google-fonts/inter`
- **Gestures & Keyboard**: `react-native-gesture-handler` and `react-native-keyboard-controller` for smooth UX

### Backend (Express / Node.js)

- **Server**: Express 5 in `server/index.ts`, routes registered in `server/routes.ts`
- **Primary Chat Endpoint**: `POST /api/chat` — accepts `{ messages, systemPrompt }`, streams responses back via SSE using the OpenAI client
- **CORS**: Dynamically allows Replit dev/deployment domains and localhost for development
- **Modular Integrations**: `server/replit_integrations/` contains plug-in modules for:
  - `chat/` — conversation CRUD + AI chat routes backed by Postgres
  - `audio/` — voice recording, speech-to-text, text-to-speech
  - `image/` — image generation via `gpt-image-1`
  - `batch/` — rate-limited batch processing with retries (`p-limit`, `p-retry`)
- **Storage Layer**: `server/storage.ts` provides an in-memory `MemStorage` implementation by default; the integration modules use the Drizzle ORM database directly

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema files**:
  - `shared/schema.ts` — `users` table (id, username, password)
  - `shared/models/chat.ts` — `conversations` and `messages` tables
- **Config**: `drizzle.config.ts` reads `DATABASE_URL` from environment
- **Migrations**: Output to `./migrations/`; push via `npm run db:push`

### API Communication

- The frontend uses `lib/query-client.ts` which reads `EXPO_PUBLIC_DOMAIN` to construct the base API URL (e.g., `https://<replit-domain>`)
- All requests go through `apiRequest()` which sets JSON headers and credentials
- Streaming chat uses raw `fetch` with SSE parsing, not TanStack Query

### Build & Deployment

- **Dev**: `npm run expo:dev` (Expo dev server) + `npm run server:dev` (tsx watch)
- **Production**: `npm run expo:static:build` (static bundle via `scripts/build.js`) + `npm run server:build` (esbuild ESM bundle) + `npm run server:prod`
- The static build script spawns Metro, fetches the bundle, and embeds it so Express can serve it

---

## External Dependencies

### AI / OpenAI
- **Package**: `openai` ^6.27.0
- **Config**: `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables (Replit AI Integrations)
- **Usage**: Chat completions (streaming), image generation, audio transcription/synthesis

### Database
- **PostgreSQL** via `pg` ^8.16.3
- **Drizzle ORM** (`drizzle-orm` ^0.39.3, `drizzle-zod` ^0.7.1)
- **Connection**: `DATABASE_URL` environment variable required

### Expo Ecosystem
- `expo-router` — file-based navigation
- `expo-blur` — blur effects for tab bar on iOS
- `expo-haptics` — tactile feedback
- `expo-image-picker` — image selection
- `expo-location` — location access (available but not yet wired to chat)
- `expo-linear-gradient` — gradient UI elements
- `expo-glass-effect` — iOS 26 liquid glass native tabs

### React Native Ecosystem
- `react-native-gesture-handler` — swipe gestures on conversation items
- `react-native-keyboard-controller` — keyboard-aware scroll behavior
- `react-native-reanimated` — animations
- `react-native-markdown-display` — renders AI markdown responses
- `react-native-safe-area-context` — safe area insets

### Utilities
- `@tanstack/react-query` — server state / data fetching
- `p-limit` + `p-retry` — concurrency control and retry logic for batch processing
- `http-proxy-middleware` — proxying during development
- `patch-package` — applied via postinstall for any patched node modules