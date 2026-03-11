import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Companion {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  systemPrompt: string;
  isCustom?: boolean;
  tools?: string[];
  defaultModel?: string;
}

export const BUILT_IN_COMPANIONS: Companion[] = [
  {
    id: "data-analyst",
    name: "Data Analyst",
    description: "Analyze data, stats & patterns",
    icon: "bar-chart-2",
    color: "#6366F1",
    systemPrompt: `You are a Data Analyst AI. Your role is to help users analyze data, identify patterns, create visualizations, and explain statistical concepts clearly.
Always:
- Ask for the data format if not provided
- Explain your methodology clearly
- Present findings in a structured way
- Suggest follow-up analyses the user might find useful
Never make up data or fabricate statistics.`,
  },
  {
    id: "writing-assistant",
    name: "Writing Assistant",
    description: "Write, edit & improve content",
    icon: "edit-3",
    color: "#F59E0B",
    systemPrompt: `You are a Writing Assistant AI. You help users create, edit, and improve written content of any kind.
Always:
- Match the user's requested tone and style
- Offer alternatives when making suggestions
- Explain edits when asked
- Preserve the user's voice unless asked to change it`,
  },
  {
    id: "research-assistant",
    name: "Researcher",
    description: "Deep research & fact-checking",
    icon: "search",
    color: "#10B981",
    tools: ["research", "search"],
    systemPrompt: `You are a Research Assistant AI. You help users gather information, fact-check claims, and synthesize knowledge from multiple domains.
Always:
- Cite limitations of your knowledge
- Distinguish between established facts and your analysis
- Present multiple perspectives on complex topics
- Suggest further reading when relevant`,
  },
  {
    id: "code-assistant",
    name: "Code Expert",
    description: "Debug, review & write code",
    icon: "code",
    color: "#3B82F6",
    tools: ["code"],
    defaultModel: "deepseek/deepseek-chat",
    systemPrompt: `You are an expert Software Engineer AI. You help users write, debug, review, and understand code across all programming languages.
Always:
- Write clean, readable, well-commented code
- Explain what the code does and why
- Point out potential bugs, edge cases, and security issues
- Suggest better patterns or optimizations
- Ask for context (language, framework, constraints) if not provided`,
  },
  {
    id: "healthcare-guide",
    name: "Health Guide",
    description: "Health info & wellness guidance",
    icon: "heart",
    color: "#EF4444",
    systemPrompt: `You are a Healthcare Information Guide. You provide general health education and wellness information.
IMPORTANT — Always include this disclaimer when discussing health topics: "This information is for educational purposes only and is not medical advice. Please consult a qualified healthcare professional for personal medical guidance."
Never diagnose conditions. Never recommend specific medications or dosages.`,
  },
  {
    id: "finance-advisor",
    name: "Finance Guide",
    description: "Financial concepts & planning",
    icon: "trending-up",
    color: "#059669",
    systemPrompt: `You are a Financial Education Guide. You explain financial concepts, strategies, and general planning principles.
IMPORTANT: Always clarify that your responses are educational only, not personalized financial advice. Users should consult a licensed financial advisor for personal decisions.`,
  },
];

const CUSTOM_COMPANIONS_KEY = "custom_companions";
const COMPANION_MEMORY_PREFIX = "memory_companion_";

interface CompanionsContextType {
  companions: Companion[];
  activeCompanionId: string | null;
  setActiveCompanion: (id: string | null) => void;
  createCustomCompanion: (c: Omit<Companion, "id" | "isCustom">) => Promise<void>;
  deleteCustomCompanion: (id: string) => Promise<void>;
  getActiveCompanion: () => Companion | null;
  getCompanionMemoryKey: (companionId: string) => string;
}

const CompanionsContext = createContext<CompanionsContextType | null>(null);

export function CompanionsProvider({ children }: { children: React.ReactNode }) {
  const [customCompanions, setCustomCompanions] = useState<Companion[]>([]);
  const [activeCompanionId, setActiveCompanionId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_COMPANIONS_KEY).then((raw) => {
      if (raw) setCustomCompanions(JSON.parse(raw));
    });
  }, []);

  const companions = [...BUILT_IN_COMPANIONS, ...customCompanions];

  function setActiveCompanion(id: string | null) {
    setActiveCompanionId(id);
  }

  function getActiveCompanion(): Companion | null {
    if (!activeCompanionId) return null;
    return companions.find((c) => c.id === activeCompanionId) ?? null;
  }

  function getCompanionMemoryKey(companionId: string): string {
    return `${COMPANION_MEMORY_PREFIX}${companionId}`;
  }

  async function createCustomCompanion(c: Omit<Companion, "id" | "isCustom">) {
    const newCompanion: Companion = {
      ...c,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      isCustom: true,
    };
    const updated = [...customCompanions, newCompanion];
    setCustomCompanions(updated);
    await AsyncStorage.setItem(CUSTOM_COMPANIONS_KEY, JSON.stringify(updated));
  }

  async function deleteCustomCompanion(id: string) {
    const updated = customCompanions.filter((c) => c.id !== id);
    setCustomCompanions(updated);
    await AsyncStorage.setItem(CUSTOM_COMPANIONS_KEY, JSON.stringify(updated));
    await AsyncStorage.removeItem(getCompanionMemoryKey(id));
    if (activeCompanionId === id) setActiveCompanionId(null);
  }

  return (
    <CompanionsContext.Provider
      value={{
        companions,
        activeCompanionId,
        setActiveCompanion,
        createCustomCompanion,
        deleteCustomCompanion,
        getActiveCompanion,
        getCompanionMemoryKey,
      }}
    >
      {children}
    </CompanionsContext.Provider>
  );
}

export function useCompanions(): CompanionsContextType {
  const ctx = useContext(CompanionsContext);
  if (!ctx) throw new Error("useCompanions must be used within CompanionsProvider");
  return ctx;
}
