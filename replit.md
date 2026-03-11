# Replit.md — Private AI Chat Application

## Overview

A **ChatGPT-style AI chat app** built with React Native (Expo) frontend and Node.js/Express backend, implementing the full Private AI Scope of Work feature set.

Key features:
- Real-time streaming AI responses via Server-Sent Events (SSE)
- Multi-model access: DeepSeek V3, Qwen 2.5, Mistral 24B/7B, Claude 3.5 Sonnet, Gemini Pro (via OpenRouter) + GPT-4o (OpenAI) + Compound Beta/Mini (Groq)
- Companions — AI personas with custom system prompts
- Incognito Mode — conversations not saved
- PII Redaction — auto-strips personal info before sending
- Prompt Library — 50+ categorized prompts accessible from chat
- Web Search Tool — Groq Compound Beta with inline citations
- Deep Research Tool — structured multi-section reports with sources
- Spaces — contextual workspaces with persistent context + instructions
- Intelligent Memory System — save facts, auto-inject into prompts
- User Personalization — tone/verbosity/expertise level settings
- Cross-Context Chat Carryover — summary generation on new chat
- Thinking Process Display — collapsible reasoning for reasoning models
- Multiple conversation management with rename/delete
- Local persistence using AsyncStorage
- Dark-themed UI with markdown rendering
- Cross-platform: iOS, Android, and Web (via Expo)

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK ~54 with `expo-router` for file-based navigation
- **Navigation**: Tab-based layout under `app/(tabs)/`, stack navigation via `app/_layout.tsx`
- **State Management**: Multiple React Contexts:
  - `contexts/ChatContext.tsx` — conversations, messages, settings
  - `contexts/SettingsContext.tsx` — app-level settings (tone, verbosity, expertiseLevel, redaction, language)
  - `contexts/CompanionsContext.tsx` — AI companions with custom personas
  - `contexts/MemoryContext.tsx` — intelligent memory storage (AsyncStorage)
  - `contexts/SpacesContext.tsx` — contextual workspaces (AsyncStorage)
- **Provider order in `_layout.tsx`**: SettingsProvider → GestureHandler → KeyboardProvider → ChatProvider → MemoryProvider → SpacesProvider → CompanionsProvider
- **Streaming**: Raw `fetch` with SSE parsing; SSE format: `data: {"content":"..."}`, `data: {"thinking":"..."}`, `data: {"citations":[...]}`, `data: [DONE]`
- **UI Components**:
  - `ChatInput` — text input + mode bar (web search, deep research, prompt library) + companion button
  - `MessageBubble` — markdown rendering + collapsible thinking section + citations + long-press memory save
  - `TypingIndicator` — animated dots
  - `Sidebar` — conversation list + Companions row + Spaces section
  - `ConversationItem` — swipe-to-reveal rename/delete
  - `SettingsSheet` — model picker + personalization chips + memory list
  - `CompanionsSheet` — companion selection
  - `PromptLibrarySheet` — categorized 50+ prompts, searchable
  - `SpaceSheet` — create/edit spaces with emoji, context, instructions
- **Fonts**: Inter (400/500/600/700) via `@expo-google-fonts/inter`
- **Keyboard**: `react-native-keyboard-controller` with `KeyboardAvoidingView`

### Backend (Express / Node.js)

- **Server**: Express 5 in `server/index.ts`, routes in `server/routes.ts`
- **Chat Endpoint**: `POST /api/chat` — SSE streaming; dispatches to OpenRouter / Groq / OpenAI based on model
- **Summarize Endpoint**: `POST /api/summarize` — fast non-streaming summary for carryover
- **Model Routing**:
  - `OPENROUTER_MODELS`: deepseek-chat, qwen-2.5-72b, mistral-small-3.1-24b, mistral-7b, claude-3.5-sonnet, gemini-pro-1.5 → OpenRouter API
  - `GROQ_MODELS`: compound-beta, compound-beta-mini, llama-3.3-70b → Groq
  - `OPENAI_MODELS`: gpt-4o, gpt-4o-mini → OpenAI (Replit Integration)
  - Mode overrides: `mode="search"` or `mode="research"` → forces compound-beta
- **Thinking Tokens**: Server sends `{thinking: "..."}` chunks from `reasoning_content` or `<think>` tag parsing
- **Research Mode**: Prepends RESEARCH_SYSTEM_PROMPT for structured reports
- **CORS**: Dynamically allows Replit dev/deployment domains

### API Communication

- Frontend uses `lib/query-client.ts` with `getApiUrl()` reading `EXPO_PUBLIC_DOMAIN`
- Chat: `${getApiUrl()}api/chat` (note: `getApiUrl()` has trailing slash)
- Streaming: `expo/fetch` for cross-platform SSE support

### Build & Deployment

- **Dev**: `npm run expo:dev` (port 8081) + `npm run server:dev` (port 5000)
- **Production**: Static Metro bundle embedded in Express server

---

## External Dependencies

### AI APIs
- **OpenRouter**: `OPENROUTER_API_KEY` — DeepSeek, Qwen, Mistral, Claude, Gemini
- **Groq**: `GROQ_API_KEY` — Compound Beta (web search/research), LLaMA
- **OpenAI** (Replit Integration): `AI_INTEGRATIONS_OPENAI_API_KEY` — GPT-4o

### Expo Ecosystem
- `expo-router` — file-based navigation
- `expo-haptics` — tactile feedback
- `expo-glass-effect` — iOS 26 liquid glass tabs
- `expo-crypto` (v15) — UUID generation

### React Native Ecosystem
- `react-native-gesture-handler` — swipe gestures
- `react-native-keyboard-controller` — keyboard handling
- `react-native-reanimated` — animations
- `react-native-markdown-display` — AI response rendering
- `react-native-safe-area-context` — safe area insets

### Utilities
- `@tanstack/react-query` — server state
- `@react-native-async-storage/async-storage` — local persistence

---

## Important Implementation Notes

- React Compiler enabled — avoid inline hook-bearing components at module level
- Dynamic styles: `useMemo(() => createStyles(C), [C])` pattern throughout
- FlatList for messages is **inverted** — newest message at bottom without scrollToEnd
- UUID generation: `Date.now().toString() + Math.random().toString(36).substr(2, 9)`
- PII redaction: `lib/redact.ts` — strips names, emails, phones, SSNs before sending
- Mode badge text in ChatInput requires `Text` imported from react-native
- Web insets: 67px top, 34px bottom on `Platform.OS === "web"`
- FUN-006 (Image Master) is excluded from scope
