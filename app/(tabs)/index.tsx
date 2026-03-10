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
import { useChatContext, Message } from "@/contexts/ChatContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useColors } from "@/lib/useColors";
import { useTranslations } from "@/lib/useTranslations";
import { getApiUrl } from "@/lib/query-client";

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

  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

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

    const userMsg = await addMessage(convId, {
      role: "user",
      content: text,
      status: "complete",
    });

    const prevMessages = messages;
    setMessages((prev) => [...prev, userMsg]);

    if (prevMessages.length === 0) {
      generateTitle(convId, text);
    }

    setIsTyping(true);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const conversation = conversations.find((c) => c.id === convId);
    const historyMessages = [...prevMessages, userMsg].map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let assistantMsgId: string | null = null;
    let fullContent = "";

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyMessages,
          systemPrompt: conversation?.systemPrompt || settings.systemPrompt,
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
                  const assistantMsg = await addMessage(convId, {
                    role: "assistant",
                    content: parsed.content,
                    status: "streaming",
                  });
                  assistantMsgId = assistantMsg.id;
                  fullContent = parsed.content;
                  setMessages((prev) => [...prev, assistantMsg]);
                } else {
                  fullContent += parsed.content;
                  const currentId = assistantMsgId;
                  const currentContent = fullContent;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const idx = updated.findIndex((m) => m.id === currentId);
                    if (idx !== -1) {
                      updated[idx] = {
                        ...updated[idx],
                        content: currentContent,
                      };
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
        await updateLastMessage(convId, (msg) => ({
          ...msg,
          content: currentContent,
          status: "complete",
        }));
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((m) => m.id === currentId);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              content: currentContent,
              status: "complete",
            };
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
          await updateLastMessage(convId, (msg) => ({
            ...msg,
            content: currentContent || "(cancelled)",
            status: "cancelled",
          }));
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
        const errorMsg = await addMessage(convId, {
          role: "assistant",
          content: "Something went wrong. Please try again.",
          status: "error",
        });
        setMessages((prev) => [...prev, errorMsg]);
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
    const id = await createConversation();
    setActiveConversationId(id);
    setMessages([]);
  };

  const handleSelectConversation = async (id: string) => {
    setShowSidebar(false);
    await loadConversation(id);
  };

  const currentConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  const reversedMessages = [...messages].reverse();

  const topPadding =
    Platform.OS === "web" ? 67 : insets.top > 0 ? insets.top : 44;

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {currentConversation?.title || t.newChat}
        </Text>
        <Pressable
          style={styles.iconBtn}
          onPress={handleNewChat}
          testID="new-chat-button"
        >
          <Feather name="edit" size={18} color={C.text} />
        </Pressable>
      </View>

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
                <Feather name="zap" size={36} color={C.primary} />
                <Text style={styles.emptyTitle}>{t.howCanIHelp}</Text>
                <Text style={styles.emptySubtitle}>{t.askMeAnything}</Text>
              </View>
            ) : null
          }
        />
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
          disabled={!activeConversationId}
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
    headerTitle: {
      flex: 1,
      color: C.text,
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      textAlign: "center",
      paddingHorizontal: 4,
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
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
