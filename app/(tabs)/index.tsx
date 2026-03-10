import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Platform,
  Pressable,
  Text,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { fetch } from "expo/fetch";
import { Feather } from "@expo/vector-icons";
import { ChatInput } from "@/components/ChatInput";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Sidebar } from "@/components/Sidebar";
import { CompanionsSheet } from "@/components/CompanionsSheet";
import { useChatContext, Message } from "@/contexts/ChatContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useCompanions } from "@/contexts/CompanionsContext";
import { useColors } from "@/lib/useColors";
import { useTranslations } from "@/lib/useTranslations";
import { getApiUrl } from "@/lib/query-client";
import { redactPII } from "@/lib/redact";

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
  const { appSettings } = useSettingsContext();
  const { getActiveCompanion, activeCompanionId } = useCompanions();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCompanions, setShowCompanions] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);

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

  const handleSend = async (text: string) => {
    if (!activeConversationId || isStreaming) return;
    const convId = activeConversationId;

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

    const historyMessages = [...prevMessages, userMsg].map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let effectiveSystemPrompt = activeCompanion
      ? activeCompanion.systemPrompt
      : conversation?.systemPrompt || settings.systemPrompt;

    let assistantMsgId: string | null = null;
    let fullContent = "";

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyMessages,
          systemPrompt: effectiveSystemPrompt,
          model: settings.model,
          language: appSettings.language,
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
            updated[idx] = { ...updated[idx], content: currentContent, status: "complete" };
          }
          return updated;
        });
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

  const handleNewChat = async () => {
    setShowSidebar(false);
    if (isIncognito) {
      setMessages([]);
      return;
    }
    const id = await createConversation();
    setActiveConversationId(id);
    setMessages([]);
  };

  const handleSelectConversation = async (id: string) => {
    setShowSidebar(false);
    setIsIncognito(false);
    await loadConversation(id);
  };

  const currentConversation = conversations.find((c) => c.id === activeConversationId);
  const activeCompanion = getActiveCompanion();
  const reversedMessages = [...messages].reverse();
  const topPadding = Platform.OS === "web" ? 67 : insets.top > 0 ? insets.top : 44;

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
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isIncognito
              ? "Incognito"
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
            onPress={handleNewChat}
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          inverted
          contentContainerStyle={[
            styles.messagesList,
            reversedMessages.length === 0 && !isTyping && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          scrollEnabled={!!(reversedMessages.length || isTyping)}
          ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
          ListEmptyComponent={
            !isTyping ? (
              <View style={styles.emptyContainer}>
                {activeCompanion ? (
                  <>
                    <View style={[styles.companionEmptyIcon, { backgroundColor: activeCompanion.color + "22" }]}>
                      <Feather name={activeCompanion.icon as any} size={32} color={activeCompanion.color} />
                    </View>
                    <Text style={styles.emptyTitle}>{activeCompanion.name}</Text>
                    <Text style={styles.emptySubtitle}>{activeCompanion.description}</Text>
                  </>
                ) : (
                  <>
                    <Feather name="zap" size={36} color={C.primary} />
                    <Text style={styles.emptyTitle}>{t.howCanIHelp}</Text>
                    <Text style={styles.emptySubtitle}>{t.askMeAnything}</Text>
                  </>
                )}
              </View>
            ) : null
          }
        />
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
          disabled={!activeConversationId && !isIncognito}
          onCompanionPress={() => setShowCompanions(true)}
          activeCompanionColor={activeCompanion?.color}
          activeCompanionIcon={activeCompanion?.icon}
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

      <CompanionsSheet
        visible={showCompanions}
        onClose={() => setShowCompanions(false)}
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
    messagesList: {
      paddingVertical: 8,
    },
    emptyList: {
      flexGrow: 1,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 12,
      transform: [{ scaleY: -1 }],
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
  });
}
