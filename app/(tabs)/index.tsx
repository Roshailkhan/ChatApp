import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Platform,
  Pressable,
  Text,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { fetch } from "expo/fetch";
import { Feather } from "@expo/vector-icons";
import { ChatInput, ChatMode, ResearchFormat } from "@/components/ChatInput";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Sidebar } from "@/components/Sidebar";
import { CompanionsSheet } from "@/components/CompanionsSheet";
import { PromptLibrarySheet } from "@/components/PromptLibrarySheet";
import { SpaceSheet } from "@/components/SpaceSheet";
import { useChatContext, Message } from "@/contexts/ChatContext";
import { useSettingsContext, LearnedStyle } from "@/contexts/SettingsContext";
import { useCompanions } from "@/contexts/CompanionsContext";
import { useMemory } from "@/contexts/MemoryContext";
import { useSpaces } from "@/contexts/SpacesContext";
import { useColors } from "@/lib/useColors";
import { useTranslations } from "@/lib/useTranslations";
import { getApiUrl } from "@/lib/query-client";
import { redactPII } from "@/lib/redact";

function buildPersonalizationPrompt(tone: string, verbosity: string, expertiseLevel: string, learnedStyle?: LearnedStyle): string {
  const parts: string[] = [];
  if (tone === "formal") parts.push("Use a formal, professional tone.");
  else if (tone === "friendly") parts.push("Use a warm, friendly, encouraging tone.");
  else parts.push("Use a natural, conversational tone.");

  if (verbosity === "concise" || learnedStyle?.prefersConcise) parts.push("Be concise and to the point. Avoid unnecessary elaboration.");
  else if (verbosity === "detailed") parts.push("Provide comprehensive, detailed responses with thorough explanations.");
  else parts.push("Provide balanced responses — not too brief, not too verbose.");

  if (expertiseLevel === "beginner") parts.push("Explain concepts simply, avoid jargon, and use analogies. Assume no prior knowledge.");
  else if (expertiseLevel === "expert") parts.push("Assume expert-level knowledge. Use technical terminology freely and skip basic explanations.");
  else parts.push("Assume intermediate knowledge. Define specialized terms when introducing them.");

  if (learnedStyle?.prefersBullets) parts.push("When listing multiple items or steps, prefer using bullet points or numbered lists.");
  if (learnedStyle?.prefersExamples) parts.push("Include concrete examples to illustrate concepts.");
  if (learnedStyle && learnedStyle.domains.length > 0) {
    parts.push(`The user frequently asks about: ${learnedStyle.domains.join(", ")}. Tailor context appropriately.`);
  }

  return parts.join(" ");
}

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  programming: ["code", "function", "algorithm", "debug", "javascript", "python", "typescript", "api", "react", "sql"],
  finance: ["stock", "investment", "portfolio", "budget", "trading", "crypto", "dividend", "etf", "market"],
  health: ["exercise", "diet", "nutrition", "symptom", "medication", "fitness", "sleep", "mental health"],
  science: ["physics", "chemistry", "biology", "experiment", "quantum", "molecular", "hypothesis"],
  law: ["contract", "legal", "lawsuit", "attorney", "regulation", "compliance", "liability"],
  marketing: ["seo", "campaign", "branding", "conversion", "funnel", "audience", "analytics"],
};

function inferPersonalization(userMessages: string[]): Partial<LearnedStyle> {
  const combined = userMessages.join(" ").toLowerCase();
  const prefersBullets = /\b(bullet|list|points?|numbered|outline)\b/.test(combined);
  const prefersConcise = /\b(shorter|brief|concise|tldr|summarize|quick)\b/.test(combined);
  const prefersExamples = /\b(example|show me|for instance|demonstrate|illustrate|like what)\b/.test(combined);

  const detectedDomains: string[] = [];
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const matches = keywords.filter((kw) => combined.includes(kw)).length;
    if (matches >= 2) detectedDomains.push(domain);
  }

  return { prefersBullets, prefersConcise, prefersExamples, domains: detectedDomains };
}

export default function ChatScreen() {
  const C = useColors();
  const t = useTranslations();
  const {
    conversations,
    createConversation,
    getMessages,
    addMessage,
    updateLastMessage,
    settings,
    generateTitle,
  } = useChatContext();
  const { appSettings, updateLearnedStyle } = useSettingsContext();
  const effectiveDefaultModels = appSettings.defaultModels || { chat: "llama-3.3-70b-versatile", code: "deepseek/deepseek-chat", research: "compound-beta", writing: "anthropic/claude-3.5-sonnet" };
  const { getActiveCompanion, activeCompanionId } = useCompanions();
  const { buildMemoryPrompt, buildCompanionMemoryPrompt } = useMemory();
  const { getActiveSpace } = useSpaces();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCompanions, setShowCompanions] = useState(false);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [showSpaceSheet, setShowSpaceSheet] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);
  const [promptFillText, setPromptFillText] = useState<string | undefined>(undefined);
  const [currentMode, setCurrentMode] = useState<ChatMode>("chat");

  const [showCarryoverModal, setShowCarryoverModal] = useState(false);
  const [carryoverSummary, setCarryoverSummary] = useState("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const pendingNewChatRef = useRef(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C), [C]);

  useEffect(() => {
    async function init() {
      if (conversations.length > 0) {
        const msgs = await getMessages(conversations[0].id);
        setActiveConversationId(conversations[0].id);
        setMessages(msgs);
      } else {
        const id = await createConversation();
        setActiveConversationId(id);
        setMessages([]);
      }
    }
    init();
  }, []);

  async function loadConversation(id: string) {
    setActiveConversationId(id);
    const msgs = await getMessages(id);
    setMessages(msgs);
  }

  const handleSend = async (text: string, mode: ChatMode, researchFormat?: ResearchFormat) => {
    if (!activeConversationId || isStreaming) return;
    const convId = activeConversationId;
    setCurrentMode(mode);

    const outgoingText = appSettings.redactionEnabled ? redactPII(text) : text;

    let userMsg: Message;
    if (isIncognito) {
      userMsg = {
        id: `incognito-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        role: "user",
        content: outgoingText,
        timestamp: Date.now(),
        status: "complete",
      };
    } else {
      userMsg = await addMessage(convId, {
        role: "user",
        content: outgoingText,
        status: "complete",
      });
    }

    const prevMessages = messages;
    setMessages((prev) => [...prev, userMsg]);

    if (!isIncognito && prevMessages.length === 0) {
      generateTitle(convId, text);
    }

    setIsTyping(true);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const conversation = conversations.find((c) => c.id === convId);
    const activeCompanion = getActiveCompanion();
    const activeSpace = getActiveSpace();

    const historyMessages = [...prevMessages, userMsg].map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let systemParts: string[] = [];

    const effectiveTone = activeCompanion?.tone ?? appSettings.tone ?? "casual";
    const effectiveVerbosity = activeCompanion?.verbosity ?? appSettings.verbosity ?? "balanced";
    const personalizationPrompt = buildPersonalizationPrompt(
      effectiveTone,
      effectiveVerbosity,
      appSettings.expertiseLevel || "intermediate",
      appSettings.learnedStyle
    );
    systemParts.push(personalizationPrompt);

    let memoryPrompt = "";
    if (activeCompanion) {
      memoryPrompt = await buildCompanionMemoryPrompt(activeCompanion.id);
    } else {
      memoryPrompt = buildMemoryPrompt();
    }
    if (memoryPrompt) systemParts.push(memoryPrompt);

    if (activeSpace) {
      if (activeSpace.context) systemParts.push(`Space Context: ${activeSpace.context}`);
      if (activeSpace.instructions) systemParts.push(`Space Instructions: ${activeSpace.instructions}`);
    }

    if (activeCompanion) {
      systemParts.push(activeCompanion.systemPrompt);
    } else if (conversation?.systemPrompt) {
      systemParts.push(conversation.systemPrompt);
    } else {
      systemParts.push(settings.systemPrompt);
    }

    if (mode === "research" && researchFormat && researchFormat !== "auto") {
      const formatInstructions: Record<string, string> = {
        summary: "Format your response as a concise executive summary with key takeaways highlighted.",
        report: "Format your response as a structured report with an introduction, main sections, and a conclusion.",
        analysis: "Format your response as a detailed analytical breakdown with evidence, implications, and insights.",
        citations: "Format your response primarily as a curated list of cited sources with brief annotations for each.",
        document: "Format your response as a comprehensive long-form document suitable for saving. Include headings, subheadings, and thorough coverage of all subtopics.",
      };
      const instruction = formatInstructions[researchFormat];
      if (instruction) systemParts.push(instruction);
    }

    const effectiveSystemPrompt = systemParts.filter(Boolean).join("\n\n");

    let assistantMsgId: string | null = null;
    let fullContent = "";
    let fullThinking = "";
    let finalCitations: string[] = [];

    try {
      const modeDefaultModel = mode ? (effectiveDefaultModels as unknown as Record<string, string>)[mode] : undefined;
      const effectiveModel = activeCompanion?.defaultModel || activeSpace?.defaultModel || modeDefaultModel || settings.model;
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyMessages,
          systemPrompt: effectiveSystemPrompt,
          model: effectiveModel,
          language: appSettings.language,
          mode,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Stream failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);

              if (parsed.thinking) {
                fullThinking += parsed.thinking;
              }

              if (parsed.citations) {
                finalCitations = parsed.citations;
              }

              if (parsed.content) {
                if (assistantMsgId === null) {
                  setIsTyping(false);
                  if (isIncognito) {
                    assistantMsgId = `incognito-asst-${Date.now()}`;
                    fullContent = parsed.content;
                    const assistantMsg: Message = {
                      id: assistantMsgId,
                      role: "assistant",
                      content: fullContent,
                      timestamp: Date.now(),
                      status: "streaming",
                    };
                    setMessages((prev) => [...prev, assistantMsg]);
                  } else {
                    const assistantMsg = await addMessage(convId, {
                      role: "assistant",
                      content: parsed.content,
                      status: "streaming",
                    });
                    assistantMsgId = assistantMsg.id;
                    fullContent = parsed.content;
                    setMessages((prev) => [...prev, assistantMsg]);
                  }
                } else {
                  fullContent += parsed.content;
                  const currentId = assistantMsgId;
                  const currentContent = fullContent;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const idx = updated.findIndex((m) => m.id === currentId);
                    if (idx !== -1) {
                      updated[idx] = { ...updated[idx], content: currentContent };
                    }
                    return updated;
                  });
                }
              }
            } catch {}
          }
        }
      }

      if (assistantMsgId) {
        const currentId = assistantMsgId;
        const currentContent = fullContent;
        const currentThinking = fullThinking;
        const currentCitations = finalCitations;
        if (!isIncognito) {
          await updateLastMessage(convId, (msg) => ({
            ...msg,
            content: currentContent,
            status: "complete",
          }));
        }
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((m) => m.id === currentId);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              content: currentContent,
              status: "complete",
              mode,
              ...(currentThinking ? { thinkingContent: currentThinking } : {}),
              ...(currentCitations.length > 0 ? { citations: currentCitations } : {}),
            } as any;
          }
          return updated;
        });

        if (!isIncognito) {
          const recentUserMessages = [...prevMessages, userMsg]
            .filter((m) => m.role === "user")
            .slice(-5)
            .map((m) => m.content);
          const inferred = inferPersonalization(recentUserMessages);
          await updateLearnedStyle(inferred);
        }
      }
    } catch (err: any) {
      setIsTyping(false);
      if (err?.name === "AbortError") {
        if (assistantMsgId) {
          const currentId = assistantMsgId;
          const currentContent = fullContent;
          if (!isIncognito) {
            await updateLastMessage(convId, (msg) => ({
              ...msg,
              content: currentContent || "(cancelled)",
              status: "cancelled",
            }));
          }
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findIndex((m) => m.id === currentId);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], status: "cancelled" };
            }
            return updated;
          });
        }
      } else {
        const errorId = `err-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: errorId,
            role: "assistant",
            content: "Something went wrong. Please try again.",
            timestamp: Date.now(),
            status: "error",
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const pendingSpaceIdRef = useRef<string | undefined>(undefined);

  const handleNewChat = async (spaceId?: string) => {
    setShowSidebar(false);
    pendingSpaceIdRef.current = spaceId;
    if (isIncognito) {
      setMessages([]);
      return;
    }
    if (!spaceId && messages.length >= 3) {
      setIsLoadingSummary(true);
      setShowCarryoverModal(true);
      try {
        const baseUrl = getApiUrl();
        const res = await fetch(`${baseUrl}api/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messages.map((m) => ({ role: m.role, content: m.content })) }),
        });
        const { summary } = await res.json();
        setCarryoverSummary(summary || "");
      } catch {
        setCarryoverSummary("");
      } finally {
        setIsLoadingSummary(false);
      }
    } else {
      await doCreateNewChat(null, spaceId);
    }
  };

  async function doCreateNewChat(summary: string | null, spaceId?: string) {
    const id = await createConversation(spaceId);
    setActiveConversationId(id);
    if (summary) {
      const carryMsg: Message = {
        id: `carry-${Date.now()}`,
        role: "system" as any,
        content: `Context from previous conversation: ${summary}`,
        timestamp: Date.now(),
        status: "complete",
      };
      setMessages([carryMsg]);
    } else {
      setMessages([]);
    }
  }

  const handleSelectConversation = async (id: string) => {
    setShowSidebar(false);
    setIsIncognito(false);
    await loadConversation(id);
  };

  const currentConversation = conversations.find((c) => c.id === activeConversationId);
  const activeCompanion = getActiveCompanion();
  const activeSpace = getActiveSpace();
  const reversedMessages = [...messages].reverse();
  const topPadding = Platform.OS === "web" ? 67 : insets.top > 0 ? insets.top : 44;

  const modeLabel = currentMode === "search" ? "Web Search" : currentMode === "research" ? "Deep Research" : currentMode === "code" ? "Code Mode" : null;
  const modeColor = currentMode === "search" ? "#3B82F6" : currentMode === "research" ? "#8B5CF6" : currentMode === "code" ? "#10B981" : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => setShowSidebar(true)}
          testID="sidebar-toggle"
        >
          <Feather name="menu" size={20} color={C.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          {isIncognito && (
            <View style={styles.incognitoBadge}>
              <Feather name="eye-off" size={11} color="#A78BFA" />
            </View>
          )}
          {activeCompanion && !isIncognito && (
            <View style={[styles.companionBadge, { backgroundColor: activeCompanion.color + "22" }]}>
              <Feather name={activeCompanion.icon as any} size={11} color={activeCompanion.color} />
            </View>
          )}
          {activeSpace && !isIncognito && (
            <Text style={styles.spaceEmoji}>{activeSpace.emoji}</Text>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isIncognito
              ? "Incognito"
              : activeSpace
              ? activeSpace.name
              : activeCompanion
              ? activeCompanion.name
              : currentConversation?.title || t.newChat}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            style={[styles.iconBtn, isIncognito && styles.iconBtnActive]}
            onPress={() => {
              setIsIncognito((prev) => {
                setMessages([]);
                return !prev;
              });
            }}
            testID="incognito-toggle"
            accessibilityRole="button"
            accessibilityLabel={isIncognito ? "Disable incognito" : "Enable incognito"}
          >
            <Feather name="eye-off" size={17} color={isIncognito ? "#A78BFA" : C.textSecondary} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => handleNewChat()}
            testID="new-chat-button"
          >
            <Feather name="edit" size={18} color={C.text} />
          </Pressable>
        </View>
      </View>

      {isIncognito && (
        <View style={styles.incognitoBar}>
          <Feather name="eye-off" size={13} color="#A78BFA" />
          <Text style={styles.incognitoBarText}>Incognito — messages are not saved</Text>
        </View>
      )}

      {activeSpace && !isIncognito && (
        <View style={styles.spaceBar}>
          <Text style={styles.spaceBarEmoji}>{activeSpace.emoji}</Text>
          <Text style={styles.spaceBarText}>{activeSpace.name}</Text>
          {activeSpace.context ? (
            <Text style={styles.spaceBarHint} numberOfLines={1}>· {activeSpace.context}</Text>
          ) : null}
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={styles.listWrapper}>
          <FlatList
            data={reversedMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              item.role === "system" ? (
                <View style={styles.systemMsgContainer}>
                  <View style={styles.systemMsgBubble}>
                    <Feather name="link" size={11} color={C.primary} />
                    <Text style={styles.systemMsgText}>{item.content}</Text>
                  </View>
                </View>
              ) : (
                <MessageBubble message={item} />
              )
            )}
            inverted
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            scrollEnabled={!!(reversedMessages.length || isTyping)}
            ListHeaderComponent={
              isTyping ? (
                <View style={styles.invertFix}>
                  {modeLabel && (
                    <View style={[styles.modeBanner, { backgroundColor: (modeColor || C.primary) + "18" }]}>
                      <Feather
                        name={currentMode === "search" ? "globe" : currentMode === "research" ? "layers" : "terminal"}
                        size={12}
                        color={modeColor || C.primary}
                      />
                      <Text style={[styles.modeBannerText, { color: modeColor || C.primary }]}>
                        {currentMode === "research" ? "Researching..." : currentMode === "search" ? "Searching the web..." : "Generating code..."}
                      </Text>
                    </View>
                  )}
                  <TypingIndicator />
                </View>
              ) : null
            }
          />

          {reversedMessages.length === 0 && !isTyping && (
            <View style={[styles.emptyOverlay, { pointerEvents: "box-none" }]}>
              <View style={styles.emptyContainer}>
                {activeCompanion ? (
                  <>
                    <View style={[styles.companionEmptyIcon, { backgroundColor: activeCompanion.color + "22" }]}>
                      <Feather name={activeCompanion.icon as any} size={32} color={activeCompanion.color} />
                    </View>
                    <Text style={styles.emptyTitle}>{activeCompanion.name}</Text>
                    <Text style={styles.emptySubtitle}>{activeCompanion.description}</Text>
                  </>
                ) : activeSpace ? (
                  <>
                    <Text style={styles.spaceEmptyEmoji}>{activeSpace.emoji}</Text>
                    <Text style={styles.emptyTitle}>{activeSpace.name}</Text>
                    <Text style={styles.emptySubtitle}>{activeSpace.context || "Your contextual workspace"}</Text>
                  </>
                ) : (
                  <>
                    <Feather name="zap" size={36} color={C.primary} />
                    <Text style={styles.emptyTitle}>{t.howCanIHelp}</Text>
                    <Text style={styles.emptySubtitle}>{t.askMeAnything}</Text>
                    <Pressable style={styles.promptLibraryBtn} onPress={() => setShowPromptLibrary(true)}>
                      <Feather name="book-open" size={14} color={C.primary} />
                      <Text style={styles.promptLibraryBtnText}>Browse Prompt Library</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          )}
        </View>
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
          disabled={!activeConversationId && !isIncognito}
          onCompanionPress={() => setShowCompanions(true)}
          activeCompanionColor={activeCompanion?.color}
          activeCompanionIcon={activeCompanion?.icon}
          onPromptLibraryPress={() => setShowPromptLibrary(true)}
          fillText={promptFillText}
          onFillTextConsumed={() => setPromptFillText(undefined)}
        />
      </KeyboardAvoidingView>

      <Modal
        visible={showSidebar}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSidebar(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.sidebarWrapper}>
            <Sidebar
              activeConversationId={activeConversationId || undefined}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              onClose={() => setShowSidebar(false)}
            />
          </View>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowSidebar(false)}
          />
        </View>
      </Modal>

      <Modal
        visible={showCarryoverModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCarryoverModal(false)}
      >
        <View style={styles.carryoverOverlay}>
          <View style={styles.carryoverCard}>
            <Text style={styles.carryoverTitle}>Start New Chat</Text>
            <Text style={styles.carryoverDesc}>
              {isLoadingSummary
                ? "Generating context summary..."
                : carryoverSummary
                ? "Carry context from this conversation into the new one?"
                : "Start a fresh conversation?"}
            </Text>
            {!!carryoverSummary && !isLoadingSummary && (
              <View style={styles.carryoverSummaryBox}>
                <Text style={styles.carryoverSummaryText}>{carryoverSummary}</Text>
              </View>
            )}
            <View style={styles.carryoverActions}>
              <Pressable
                style={styles.carryoverBtnSecondary}
                onPress={async () => {
                  setShowCarryoverModal(false);
                  await doCreateNewChat(null, pendingSpaceIdRef.current);
                }}
              >
                <Text style={styles.carryoverBtnSecondaryText}>Start Fresh</Text>
              </Pressable>
              <Pressable
                style={[styles.carryoverBtnPrimary, (!carryoverSummary || isLoadingSummary) && styles.carryoverBtnDisabled]}
                disabled={!carryoverSummary || isLoadingSummary}
                onPress={async () => {
                  setShowCarryoverModal(false);
                  await doCreateNewChat(carryoverSummary, pendingSpaceIdRef.current);
                }}
              >
                <Text style={styles.carryoverBtnPrimaryText}>Carry Context</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <CompanionsSheet
        visible={showCompanions}
        onClose={() => setShowCompanions(false)}
      />

      <PromptLibrarySheet
        visible={showPromptLibrary}
        onClose={() => setShowPromptLibrary(false)}
        onSelect={(text) => setPromptFillText(text)}
      />

      <SpaceSheet
        visible={showSpaceSheet}
        onClose={() => setShowSpaceSheet(false)}
      />
    </View>
  );
}

function createStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    flex: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingBottom: 12,
      backgroundColor: C.background,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    headerCenter: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 4,
    },
    headerTitle: {
      color: C.text,
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      flexShrink: 1,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
    iconBtnActive: {
      backgroundColor: "#A78BFA22",
    },
    incognitoBadge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "#A78BFA22",
      alignItems: "center",
      justifyContent: "center",
    },
    companionBadge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    spaceEmoji: {
      fontSize: 16,
    },
    incognitoBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: "#A78BFA18",
      borderBottomWidth: 1,
      borderBottomColor: "#A78BFA33",
    },
    incognitoBarText: {
      color: "#A78BFA",
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    spaceBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: C.surface2,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    spaceBarEmoji: { fontSize: 13 },
    spaceBarText: {
      color: C.textSecondary,
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
    spaceBarHint: {
      color: C.textTertiary,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      flex: 1,
    },
    messagesList: {
      paddingVertical: 8,
    },
    emptyList: {
      flexGrow: 1,
    },
    invertFix: {
      transform: [{ scale: -1 }],
    },
    listWrapper: {
      flex: 1,
      position: "relative",
    },
    emptyOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyTitle: {
      color: C.text,
      fontSize: 22,
      fontFamily: "Inter_600SemiBold",
      textAlign: "center",
    },
    emptySubtitle: {
      color: C.textSecondary,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 20,
    },
    companionEmptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    spaceEmptyEmoji: {
      fontSize: 48,
    },
    promptLibraryBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.primary + "55",
      backgroundColor: C.primary + "11",
    },
    promptLibraryBtnText: {
      color: C.primary,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    modeBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 6,
      marginHorizontal: 16,
      marginBottom: 4,
      borderRadius: 8,
    },
    modeBannerText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
    systemMsgContainer: {
      paddingHorizontal: 16,
      paddingVertical: 4,
      alignItems: "center",
    },
    systemMsgBubble: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      backgroundColor: C.surface2,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      maxWidth: "90%",
    },
    systemMsgText: {
      color: C.textSecondary,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
      flex: 1,
      fontStyle: "italic",
    },
    modalContainer: {
      flex: 1,
      flexDirection: "row",
    },
    sidebarWrapper: {
      width: "75%",
      maxWidth: 320,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    carryoverOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    carryoverCard: {
      backgroundColor: C.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      padding: 24,
      width: "100%",
      maxWidth: 380,
    },
    carryoverTitle: {
      color: C.text,
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 8,
    },
    carryoverDesc: {
      color: C.textSecondary,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      lineHeight: 20,
      marginBottom: 12,
    },
    carryoverSummaryBox: {
      backgroundColor: C.surface2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
      marginBottom: 16,
    },
    carryoverSummaryText: {
      color: C.textSecondary,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 19,
      fontStyle: "italic",
    },
    carryoverActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    carryoverBtnSecondary: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: C.surface2,
      borderWidth: 1,
      borderColor: C.border,
    },
    carryoverBtnSecondaryText: {
      color: C.textSecondary,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
    },
    carryoverBtnPrimary: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: C.primary,
    },
    carryoverBtnDisabled: {
      backgroundColor: C.surface3,
    },
    carryoverBtnPrimaryText: {
      color: "#fff",
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
  });
}
