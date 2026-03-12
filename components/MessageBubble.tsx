import React, { memo, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Alert,
  Clipboard,
  Modal,
  ScrollView,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useColors } from "@/lib/useColors";
import { Message } from "@/contexts/ChatContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMemory } from "@/contexts/MemoryContext";
import { scoreSource } from "@/lib/credibility";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  message: Message;
  onSaveMemory?: (text: string) => void;
}

function CodeBlock({ children, language }: { children: string; language?: string }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setString(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLanguage}>{language || "code"}</Text>
        <Pressable onPress={handleCopy} hitSlop={8} style={styles.copyBtn}>
          <Feather name={copied ? "check" : "copy"} size={13} color={copied ? "#10B981" : C.textSecondary} />
          <Text style={[styles.copyText, copied && styles.copyTextDone]}>
            {copied ? "Copied!" : "Copy"}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.codeText}>{children}</Text>
    </View>
  );
}

function CitationChip({ url, index }: { url: string; index: number }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const cred = useMemo(() => scoreSource(url), [url]);

  let displayUrl = url;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    displayUrl = parsed.hostname.replace(/^www\./, "") + (parsed.pathname !== "/" ? parsed.pathname.substring(0, 20) : "");
  } catch {}

  return (
    <View style={styles.citationChip}>
      <View style={[styles.credBadge, { backgroundColor: cred.color + "22" }]}>
        <Text style={[styles.credScore, { color: cred.color }]}>{cred.score}</Text>
      </View>
      <Feather name="link" size={10} color={C.primary} />
      <Text style={styles.citationText} numberOfLines={1}>{displayUrl}</Text>
      <View style={[styles.credLabel, { backgroundColor: cred.color + "18" }]}>
        <Text style={[styles.credLabelText, { color: cred.color }]}>{cred.label}</Text>
      </View>
    </View>
  );
}

function ResearchDocumentModal({
  visible,
  onClose,
  content,
  citations,
}: {
  visible: boolean;
  onClose: () => void;
  content: string;
  citations?: string[];
}) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C), [C]);
  const [copied, setCopied] = useState(false);

  const markdownStyles = useMemo(
    () => ({
      body: { color: C.text, fontSize: 15, lineHeight: 24, fontFamily: "Inter_400Regular" },
      heading1: { color: C.text, fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 16, marginBottom: 8 },
      heading2: { color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 18, marginTop: 14, marginBottom: 6 },
      heading3: { color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginTop: 10, marginBottom: 4 },
      paragraph: { marginTop: 0, marginBottom: 8, color: C.text, fontSize: 15, lineHeight: 24 },
      list_item: { color: C.text, fontSize: 15, lineHeight: 24 },
      code_inline: {
        backgroundColor: C.surface3,
        color: C.primaryLight,
        fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
        fontSize: 13,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
      },
      blockquote: {
        backgroundColor: C.surface2,
        borderLeftColor: C.primary,
        borderLeftWidth: 3,
        paddingLeft: 12,
        paddingVertical: 4,
        borderRadius: 2,
      },
      hr: { backgroundColor: C.border, height: 1, marginVertical: 16 },
      strong: { fontFamily: "Inter_600SemiBold", color: C.text },
      em: { color: C.text, fontStyle: "italic" as const },
      link: { color: C.primary },
    }),
    [C]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleCopy = async () => {
    Clipboard.setString(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.docContainer, { paddingTop: topPad }]}>
        <View style={styles.docHeader}>
          <View style={styles.docHeaderLeft}>
            <View style={styles.docIconBox}>
              <Feather name="file-text" size={16} color="#8B5CF6" />
            </View>
            <View>
              <Text style={styles.docTitle}>Research Report</Text>
              <Text style={styles.docSubtitle}>Deep Analysis</Text>
            </View>
          </View>
          <View style={styles.docHeaderActions}>
            <Pressable style={styles.docActionBtn} onPress={handleCopy} hitSlop={8}>
              <Feather name={copied ? "check" : "copy"} size={16} color={copied ? "#10B981" : C.textSecondary} />
            </Pressable>
            <Pressable style={styles.docCloseBtn} onPress={onClose}>
              <Feather name="x" size={18} color={C.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.docScroll}
          contentContainerStyle={[styles.docContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Markdown style={markdownStyles}>{content}</Markdown>

          {citations && citations.length > 0 && (
            <View style={styles.docSourcesSection}>
              <View style={styles.docSourcesHeader}>
                <Feather name="globe" size={14} color={C.textTertiary} />
                <Text style={styles.docSourcesTitle}>Sources</Text>
                <View style={[styles.docSourcesBadge, { backgroundColor: "#8B5CF6" + "22" }]}>
                  <Text style={[styles.docSourcesBadgeText, { color: "#8B5CF6" }]}>{citations.length}</Text>
                </View>
              </View>
              {citations.map((url, i) => (
                <CitationChip key={i} url={url} index={i} />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function MessageBubbleInner({ message }: Props) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const { addMemory } = useMemory();
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const [showDocument, setShowDocument] = useState(false);

  const markdownStyles = useMemo(
    () => ({
      body: { color: C.text, fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
      heading1: { color: C.text, fontFamily: "Inter_700Bold", fontSize: 20, marginTop: 8, marginBottom: 4 },
      heading2: { color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 17, marginTop: 6, marginBottom: 4 },
      heading3: { color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 15, marginTop: 4, marginBottom: 2 },
      paragraph: { marginTop: 0, marginBottom: 4, color: C.text, fontSize: 15, lineHeight: 22 },
      list_item: { color: C.text, fontSize: 15, lineHeight: 22 },
      code_inline: {
        backgroundColor: C.surface3,
        color: C.primaryLight,
        fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
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
      th: { backgroundColor: C.surface2, color: C.text, fontFamily: "Inter_600SemiBold", padding: 8, borderColor: C.border },
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
      return <CodeBlock key={node.key} language={lang}>{content}</CodeBlock>;
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
          { text: "Copy", onPress: () => Clipboard.setString(message.content) },
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
  const isResearch = message.mode === "research" && message.role === "assistant" && message.status === "complete";

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
    <>
      <Pressable onLongPress={handleLongPress} delayLongPress={500}>
        <View style={styles.assistantContainer}>
          <View style={styles.assistantIcon}>
            <Feather name="zap" size={13} color={C.primary} />
          </View>
          <View style={styles.assistantContent}>
            {!!thinkingContent && (
              <Pressable style={styles.thinkingHeader} onPress={() => setThinkingExpanded((v) => !v)}>
                <Feather name="cpu" size={12} color={C.primary} />
                <Text style={styles.thinkingLabel}>Thinking</Text>
                <Feather name={thinkingExpanded ? "chevron-up" : "chevron-down"} size={12} color={C.textTertiary} />
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
                <View style={styles.citationsHeader}>
                  <Feather name="globe" size={11} color={C.textTertiary} />
                  <Text style={styles.citationsLabel}>Sources</Text>
                </View>
                {citations.map((url: string, i: number) => (
                  <CitationChip key={i} url={url} index={i} />
                ))}
              </View>
            )}
            {isResearch && (
              <Pressable style={styles.viewDocBtn} onPress={() => setShowDocument(true)}>
                <Feather name="file-text" size={13} color="#8B5CF6" />
                <Text style={styles.viewDocText}>View as Document</Text>
                <Feather name="arrow-right" size={12} color="#8B5CF6" />
              </Pressable>
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
      {isResearch && (
        <ResearchDocumentModal
          visible={showDocument}
          onClose={() => setShowDocument(false)}
          content={message.content}
          citations={citations}
        />
      )}
    </>
  );
}

export const MessageBubble = memo(MessageBubbleInner);

function createStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    userContainer: { paddingHorizontal: 16, paddingVertical: 6, alignItems: "flex-end" },
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
    userText: { color: C.text, fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
    assistantContainer: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 6, alignItems: "flex-start", gap: 10 },
    assistantIcon: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: C.surface2, alignItems: "center", justifyContent: "center",
      marginTop: 2, flexShrink: 0, borderWidth: 1, borderColor: C.border,
    },
    assistantContent: { flex: 1 },
    errorText: { color: C.error, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
    cancelledText: { color: C.textTertiary, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, fontStyle: "italic" },
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
    codeLanguage: { color: C.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" },
    copyBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    copyText: { color: C.textSecondary, fontSize: 11, fontFamily: "Inter_400Regular" },
    copyTextDone: { color: "#10B981" },
    codeText: {
      color: C.text,
      fontSize: 13,
      lineHeight: 20,
      padding: 12,
      fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    },
    thinkingHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6, paddingVertical: 4 },
    thinkingLabel: { color: C.primary, fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
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
    thinkingText: { color: C.textTertiary, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, fontStyle: "italic" },
    citationsContainer: { marginTop: 10, gap: 5 },
    citationsHeader: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
    citationsLabel: { color: C.textTertiary, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
    citationChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: C.surface2,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: C.border,
    },
    credBadge: {
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    credScore: { fontSize: 10, fontFamily: "Inter_700Bold" },
    citationText: { color: C.primary, fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
    credLabel: {
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    credLabelText: { fontSize: 10, fontFamily: "Inter_500Medium" },
    viewDocBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 10,
      backgroundColor: "#8B5CF6" + "18",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: "#8B5CF6" + "33",
      alignSelf: "flex-start",
    },
    viewDocText: { color: "#8B5CF6", fontSize: 12, fontFamily: "Inter_500Medium" },
    docContainer: { flex: 1, backgroundColor: C.background },
    docHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    docHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    docIconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: "#8B5CF6" + "22",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#8B5CF6" + "33",
    },
    docTitle: { color: C.text, fontSize: 16, fontFamily: "Inter_600SemiBold" },
    docSubtitle: { color: C.textTertiary, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
    docHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    docActionBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.surface2, alignItems: "center", justifyContent: "center",
    },
    docCloseBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.surface2, alignItems: "center", justifyContent: "center",
    },
    docScroll: { flex: 1 },
    docContent: { paddingHorizontal: 24, paddingTop: 24 },
    docSourcesSection: {
      marginTop: 32,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: C.border,
      gap: 8,
    },
    docSourcesHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    docSourcesTitle: {
      color: C.textTertiary,
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.8,
      flex: 1,
    },
    docSourcesBadge: {
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    docSourcesBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  });
}
