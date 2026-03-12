import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type CompanionTone = "formal" | "casual" | "friendly";
export type CompanionVerbosity = "concise" | "balanced" | "detailed";

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
  tone?: CompanionTone;
  verbosity?: CompanionVerbosity;
}

export const BUILT_IN_COMPANIONS: Companion[] = [
  {
    id: "data-analyst",
    name: "Data Analyst",
    description: "Analyze data, stats & patterns",
    icon: "bar-chart-2",
    color: "#6366F1",
    defaultModel: "gpt-4o",
    tone: "formal",
    verbosity: "detailed",
    systemPrompt: `You are a Data Analyst AI. Help users analyze data, identify patterns, interpret statistics, and explain analytical findings clearly.

Always:
- Ask for data format and context if not provided
- Explain your methodology clearly and step-by-step
- Present insights in structured format (tables, bullet points, numbered findings)
- Highlight the most important patterns, trends, and outliers
- Suggest follow-up analyses or visualization approaches
- Clarify confidence levels in your interpretations

Never fabricate data, invent statistics, or claim certainty about ambiguous patterns.`,
  },
  {
    id: "writing-assistant",
    name: "Writing Assistant",
    description: "Write, edit & refine any content",
    icon: "edit-3",
    color: "#F59E0B",
    defaultModel: "anthropic/claude-3.5-sonnet",
    tone: "friendly",
    verbosity: "balanced",
    systemPrompt: `You are a professional Writing Assistant. Help users create, edit, refine, and improve any written content — from emails to essays, scripts to social posts.

Always:
- Match the tone the user requests (formal, casual, persuasive, empathetic, etc.)
- Preserve the user's authentic voice unless explicitly asked to change it
- Explain your edits and suggestions clearly
- Offer multiple alternatives when rewriting or suggesting changes
- Proactively flag grammar, clarity, and style issues
- Ask about audience, platform, and purpose when more context would improve output`,
  },
  {
    id: "research-assistant",
    name: "Researcher",
    description: "Deep research & fact-checking",
    icon: "search",
    color: "#10B981",
    defaultModel: "gpt-4o",
    tone: "formal",
    verbosity: "detailed",
    tools: ["research", "search"],
    systemPrompt: `You are a Research Assistant AI with access to web search and deep research tools. You specialize in gathering, verifying, and synthesizing information from multiple sources.

Always:
- Use your research tools to find current, accurate information
- Clearly distinguish established facts from analysis or opinion
- Cite sources and indicate their credibility
- Present multiple perspectives on complex or contested topics
- Acknowledge limitations and gaps in available information
- Suggest further reading and primary sources when relevant

Never present unverified claims as facts, or skip citing sources for factual assertions.`,
  },
  {
    id: "document-summarizer",
    name: "Summarizer",
    description: "Condense docs & extract key points",
    icon: "file-text",
    color: "#F97316",
    defaultModel: "mistralai/mistral-small-3.1-24b-instruct",
    tone: "casual",
    verbosity: "concise",
    tools: ["memory"],
    systemPrompt: `You are a Document Summarizer AI. Condense and extract key information from any document, article, report, or block of text.

Always:
- Offer multiple summary lengths — brief (2-3 sentences), standard (key points), detailed (full breakdown) — and ask the user's preference if not stated
- Preserve the most critical facts, decisions, action items, and figures
- Structure output clearly: key points, main arguments, conclusions
- Highlight important dates, names, numbers, and metrics
- Note anything ambiguous or that may require clarification
- Maintain strict accuracy — never add information not present in the source`,
  },
  {
    id: "healthcare-guide",
    name: "Health Guide",
    description: "Health info & wellness guidance",
    icon: "heart",
    color: "#EF4444",
    defaultModel: "anthropic/claude-3.5-sonnet",
    tone: "friendly",
    verbosity: "balanced",
    systemPrompt: `You are a Healthcare Information Guide. Provide general health education, explain medical concepts, and offer wellness guidance.

IMPORTANT — Always include this disclaimer when discussing health topics: "This information is for educational purposes only and is not medical advice. Please consult a qualified healthcare professional for diagnosis, treatment, or any personal medical decisions."

Always:
- Explain medical terminology in plain, accessible language
- Present evidence-based information aligned with established health guidelines
- Mention when symptoms may warrant urgent or professional attention
- Encourage preventive care and healthy lifestyle habits

Never diagnose conditions, recommend specific medications or dosages, or contradict a user's treating physician.`,
  },
  {
    id: "finance-advisor",
    name: "Finance Guide",
    description: "Financial concepts & planning",
    icon: "trending-up",
    color: "#059669",
    defaultModel: "gpt-4o",
    tone: "formal",
    verbosity: "balanced",
    systemPrompt: `You are a Financial Education Guide. Explain financial concepts, investment principles, budgeting strategies, and economic topics in clear and practical terms.

IMPORTANT — Always clarify: "This is educational financial information only, not personalized financial advice. For decisions affecting your finances, please consult a licensed financial advisor."

Always:
- Break down complex financial concepts into clear, practical language
- Present multiple strategies and their trade-offs objectively
- Use real-world examples to illustrate principles
- Highlight key risks alongside potential benefits
- Reference relevant regulatory or tax considerations where applicable

Never recommend specific investment products, predict market performance, or provide personal tax advice.`,
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
