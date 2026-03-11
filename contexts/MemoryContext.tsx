import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Memory {
  id: string;
  text: string;
  createdAt: number;
  source: "manual" | "auto";
}

interface MemoryContextType {
  memories: Memory[];
  addMemory: (text: string, source?: Memory["source"]) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  clearAllMemories: () => Promise<void>;
  buildMemoryPrompt: () => string;
  buildCompanionMemoryPrompt: (companionId: string) => Promise<string>;
  addCompanionMemory: (companionId: string, text: string) => Promise<void>;
  getCompanionMemories: (companionId: string) => Promise<Memory[]>;
}

const MemoryContext = createContext<MemoryContextType | null>(null);
const MEMORY_KEY = "ai_memories";
const COMPANION_MEMORY_PREFIX = "memory_companion_";

export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(MEMORY_KEY).then((raw) => {
      if (raw) setMemories(JSON.parse(raw));
    });
  }, []);

  async function save(updated: Memory[]) {
    setMemories(updated);
    await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(updated));
  }

  async function addMemory(text: string, source: Memory["source"] = "manual") {
    const mem: Memory = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      text: text.trim(),
      createdAt: Date.now(),
      source,
    };
    await save([mem, ...memories]);
  }

  async function deleteMemory(id: string) {
    await save(memories.filter((m) => m.id !== id));
  }

  async function clearAllMemories() {
    await save([]);
  }

  function buildMemoryPrompt(): string {
    if (memories.length === 0) return "";
    const lines = memories.map((m) => `- ${m.text}`).join("\n");
    return `User memories and preferences:\n${lines}`;
  }

  async function getCompanionMemories(companionId: string): Promise<Memory[]> {
    const raw = await AsyncStorage.getItem(`${COMPANION_MEMORY_PREFIX}${companionId}`);
    return raw ? JSON.parse(raw) : [];
  }

  async function addCompanionMemory(companionId: string, text: string) {
    const key = `${COMPANION_MEMORY_PREFIX}${companionId}`;
    const existing = await getCompanionMemories(companionId);
    const mem: Memory = {
      id: `cmem-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      text: text.trim(),
      createdAt: Date.now(),
      source: "manual",
    };
    await AsyncStorage.setItem(key, JSON.stringify([mem, ...existing]));
  }

  async function buildCompanionMemoryPrompt(companionId: string): Promise<string> {
    const mems = await getCompanionMemories(companionId);
    if (mems.length === 0) return "";
    const lines = mems.map((m) => `- ${m.text}`).join("\n");
    return `Companion-specific memories:\n${lines}`;
  }

  return (
    <MemoryContext.Provider value={{
      memories, addMemory, deleteMemory, clearAllMemories, buildMemoryPrompt,
      buildCompanionMemoryPrompt, addCompanionMemory, getCompanionMemories,
    }}>
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory(): MemoryContextType {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error("useMemory must be used within MemoryProvider");
  return ctx;
}
