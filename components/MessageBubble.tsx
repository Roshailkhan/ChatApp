import React, { memo, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Alert,
  Clipboard,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useColors } from "@/lib/useColors";
import { Message } from "@/contexts/ChatContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMemory } from "@/contexts/MemoryContext";

interface Props {
  message: Message;
  onSaveMemory?: (text: string) => void;
}

function CodeBlock({
  children,
  language,
}: {
  children: string;
  language?: string;
}) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);

  const handleCopy = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setString(children);
  };

  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLanguage}>{language || "code"}</Text>
        <Pressable onPress={handleCopy} hitSlop={8}>
          <Feather name="copy" size={13} color={C.textSecondary} />
        </Pressable>
      </View>
      <Text style={styles.codeText}>{children}</Text>
    </View>
  );
}

function MessageBubbleInner({ message }: Props) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { addMemory } = useMemory();
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

  const markdownStyles = useMemo(
    () => ({
      body: {
        color: C.text,
        fontSize: 15,
        lineHeight: 22,
        fontFamily: "Inter_400Regular",
      },
      heading1: {
        color: C.text,
        fontFamily: "Inter_700Bold",
        fontSize: 20,
        marginTop: 8,
        marginBottom: 4,
      },
      heading2: {
        color: C.text,
        fontFamily: "Inter_600SemiBold",
        fontSize: 17,
        marginTop: 6,
        marginBottom: 4,
      },
      heading3: {
        color: C.text,
        fontFamily: "Inter_600SemiBold",
        fontSize: 15,
        marginTop: 4,
        marginBottom: 2,
      },
      paragraph: {
        marginTop: 0,
        marginBottom: 4,
        color: C.text,
        fontSize: 15,
        lineHeight: 22,
      },
      list_item: { color: C.text, fontSize: 15, lineHeight: 22 },
      code_inline: {
        backgroundColor: C.surface3,
        color: C.primaryLight,
        fontFamily: Platform.select({
          ios: "Menlo",
          android: "monospace",
          default: "monospace",
        }),
        fontSize: 13,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
      },
      fence: { backgroundColor: "transparent", padding: 0, marginVertical: 0 },
      code_block: { backgroundColor: "transparent", padding: 0 },
      blockquote: {
        backgroundColor: C.surface2,
        borderLeftColor: C.primary,
        borderLeftWidth: 3,
        paddingLeft: 12,
        paddingVertical: 4,
        borderRadius: 2,
      },
      hr: { backgroundColor: C.border, height: 1, marginVertical: 12 },
      table: { borderWidth: 1, borderColor: C.border, borderRadius: 6 },
      th: {
        backgroundColor: C.surface2,
        color: C.text,
        fontFamily: "Inter_600SemiBold",
        padding: 8,
        borderColor: C.border,
      },
      td: { color: C.text, padding: 8, borderColor: C.border },
      strong: { fontFamily: "Inter_600SemiBold", color: C.text },
      em: { color: C.text, fontStyle: "italic" as const },
      link: { color: C.primary },
    }),
    [C]
  );

  const isUser = message.role === "user";

  const rules = {
    fence: (node: any, children: any, parent: any, ruleStyles: any) => {
      const content = node.content || "";
      const lang = node.sourceInfo || "";
      return (
        <CodeBlock key={node.key} language={lang}>
          {content}
        </CodeBlock>
      );
    },
    code_block: (node: any) => {
      const content = node.content || "";
      return <CodeBlock key={node.key}>{content}</CodeBlock>;
    },
  };

  const handleLongPress = async () => {
    if (!isUser && message.content) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Message Actions",
        undefined,
        [
          {
            text: "Copy",
            onPress: () => Clipboard.setString(message.content),
          },
          {
            text: "Save as Memory",
            onPress: async () => {
              const snippet = message.content.substring(0, 200);
              await addMemory(snippet, "manual");
              Alert.alert("Saved", "Added to your memory.");
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const thinkingContent = (message as any).thinkingContent as string | undefined;
  const citations = (message as any).citations as string[] | undefined;

  if (isUser) {
    return (
      <View style={styles.userContainer}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable onLongPress={handleLongPress} delayLongPress={500}>
      <View style={styles.assistantContainer}>
        <View style={styles.assistantIcon}>
          <Feather name="zap" size={13} color={C.primary} />
        </View>
        <View style={styles.assistantContent}>
          {!!thinkingContent && (
            <Pressable
              style={styles.thinkingHeader}
              onPress={() => setThinkingExpanded((v) => !v)}
            >
              <Feather name="cpu" size={12} color={C.primary} />
              <Text style={styles.thinkingLabel}>Thinking</Text>
              <Feather
                name={thinkingExpanded ? "chevron-up" : "chevron-down"}
                size={12}
                color={C.textTertiary}
              />
            </Pressable>
          )}
          {!!thinkingContent && thinkingExpanded && (
            <View style={styles.thinkingBody}>
              <Text style={styles.thinkingText}>{thinkingContent}</Text>
            </View>
          )}
          <Markdown style={markdownStyles} rules={rules}>
            {message.content || " "}
          </Markdown>
          {citations && citations.length > 0 && (
            <View style={styles.citationsContainer}>
              <Text style={styles.citationsLabel}>Sources</Text>
              {citations.map((url: string, i: number) => (
                <View key={i} style={styles.citationChip}>
                  <Feather name="link" size={10} color={C.primary} />
                  <Text style={styles.citationText} numberOfLines={1}>{url}</Text>
                </View>
              ))}
            </View>
          )}
          {message.status === "error" && (
            <Text style={styles.errorText}>Failed to get response</Text>
          )}
          {message.status === "cancelled" && (
            <Text style={styles.cancelledText}>Cancelled</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export const MessageBubble = memo(MessageBubbleInner);

function createStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    userContainer: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      alignItems: "flex-end",
    },
    userBubble: {
      backgroundColor: C.userBubble,
      borderColor: C.userBubbleBorder,
      borderWidth: 1,
      borderRadius: 18,
      borderBottomRightRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxWidth: "85%",
    },
    userText: {
      color: C.text,
      fontSize: 15,
      lineHeight: 22,
      fontFamily: "Inter_400Regular",
    },
    assistantContainer: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 6,
      alignItems: "flex-start",
      gap: 10,
    },
    assistantIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: C.surface2,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      flexShrink: 0,
      borderWidth: 1,
      borderColor: C.border,
    },
    assistantContent: { flex: 1 },
    errorText: {
      color: C.error,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      marginTop: 4,
    },
    cancelledText: {
      color: C.textTertiary,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      marginTop: 4,
      fontStyle: "italic",
    },
    codeBlock: {
      backgroundColor: C.surface2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.border,
      marginVertical: 6,
      overflow: "hidden",
    },
    codeHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      backgroundColor: C.surface3,
    },
    codeLanguage: {
      color: C.textSecondary,
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
    codeText: {
      color: C.text,
      fontSize: 13,
      lineHeight: 20,
      padding: 12,
      fontFamily: Platform.select({
        ios: "Menlo",
        android: "monospace",
        default: "monospace",
      }),
    },
    thinkingHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
      paddingVertical: 4,
    },
    thinkingLabel: {
      color: C.primary,
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      flex: 1,
    },
    thinkingBody: {
      backgroundColor: C.surface2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.border,
      borderLeftWidth: 3,
      borderLeftColor: C.primary,
      padding: 10,
      marginBottom: 8,
    },
    thinkingText: {
      color: C.textTertiary,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
      fontStyle: "italic",
    },
    citationsContainer: {
      marginTop: 10,
      gap: 4,
    },
    citationsLabel: {
      color: C.textTertiary,
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    citationChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: C.surface2,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: C.border,
    },
    citationText: {
      color: C.primary,
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      flex: 1,
    },
  });
}
