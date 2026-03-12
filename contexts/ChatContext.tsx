import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  status: "pending" | "streaming" | "complete" | "error" | "cancelled";
  mode?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  systemPrompt: string;
  spaceId?: string;
}

export interface Settings {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

const CONVERSATIONS_KEY = "chat_conversations";
const SETTINGS_KEY = "chat_settings";

const defaultSettings: Settings = {
  model: "llama-3.3-70b-versatile",
  systemPrompt: "You are a helpful, knowledgeable, and concise AI assistant.",
  temperature: 0.7,
  maxTokens: 8192,
};

let msgCounter = 0;
function generateId(): string {
  msgCounter++;
  return `id-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

interface ChatContextType {
  conversations: Conversation[];
  createConversation: (spaceId?: string) => Promise<string>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  getMessages: (conversationId: string) => Promise<Message[]>;
  addMessage: (conversationId: string, message: Omit<Message, "id" | "timestamp">) => Promise<Message>;
  updateLastMessage: (conversationId: string, updater: (msg: Message) => Message) => Promise<void>;
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  generateTitle: (conversationId: string, firstMessage: string) => Promise<void>;
  getSpaceConversations: (spaceId: string) => Conversation[];
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(CONVERSATIONS_KEY),
      AsyncStorage.getItem(SETTINGS_KEY),
    ]).then(([convsRaw, settingsRaw]) => {
      if (convsRaw) setConversations(JSON.parse(convsRaw));
      if (settingsRaw) setSettings({ ...defaultSettings, ...JSON.parse(settingsRaw) });
    });
  }, []);

  async function saveConversations(updated: Conversation[]) {
    setConversations(updated);
    await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated));
  }

  async function createConversation(spaceId?: string): Promise<string> {
    const conv: Conversation = {
      id: generateId(),
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: settings.model,
      systemPrompt: settings.systemPrompt,
      ...(spaceId ? { spaceId } : {}),
    };
    await saveConversations([conv, ...conversations]);
    return conv.id;
  }

  async function deleteConversation(id: string) {
    await saveConversations(conversations.filter((c) => c.id !== id));
    await AsyncStorage.removeItem(`messages_${id}`);
  }

  async function renameConversation(id: string, title: string) {
    await saveConversations(
      conversations.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c))
    );
  }

  async function getMessages(conversationId: string): Promise<Message[]> {
    const raw = await AsyncStorage.getItem(`messages_${conversationId}`);
    return raw ? JSON.parse(raw) : [];
  }

  async function saveMessages(conversationId: string, messages: Message[]) {
    await AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify(messages));
  }

  async function addMessage(conversationId: string, message: Omit<Message, "id" | "timestamp">): Promise<Message> {
    const newMsg: Message = { ...message, id: generateId(), timestamp: Date.now() };
    const existing = await getMessages(conversationId);
    const updated = [...existing, newMsg];
    await saveMessages(conversationId, updated);
    await saveConversations(
      conversations.map((c) => (c.id === conversationId ? { ...c, updatedAt: Date.now() } : c))
    );
    return newMsg;
  }

  async function updateLastMessage(conversationId: string, updater: (msg: Message) => Message) {
    const existing = await getMessages(conversationId);
    if (existing.length === 0) return;
    const updated = [...existing];
    updated[updated.length - 1] = updater(updated[updated.length - 1]);
    await saveMessages(conversationId, updated);
  }

  async function updateSettings(s: Partial<Settings>) {
    const updated = { ...settings, ...s };
    setSettings(updated);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  }

  async function generateTitle(conversationId: string, firstMessage: string) {
    try {
      const baseUrl = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/`
        : "http://localhost:5000/";
      const res = await fetch(`${baseUrl}api/title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: firstMessage }),
      });
      if (res.ok) {
        const { title } = await res.json();
        if (title) await renameConversation(conversationId, title);
      }
    } catch {
      await renameConversation(conversationId, firstMessage.substring(0, 40));
    }
  }

  function getSpaceConversations(spaceId: string): Conversation[] {
    return conversations.filter((c) => c.spaceId === spaceId);
  }

  return (
    <ChatContext.Provider
      value={{
        conversations,
        createConversation,
        deleteConversation,
        renameConversation,
        getMessages,
        addMessage,
        updateLastMessage,
        settings,
        updateSettings,
        generateTitle,
        getSpaceConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextType {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}
