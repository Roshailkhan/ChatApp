import React, { memo } from "react";
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
import Colors from "@/constants/colors";
import { Message } from "@/contexts/ChatContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface Props {
  message: Message;
}

function CodeBlock({
  children,
  language,
}: {
  children: string;
  language?: string;
}) {
  const handleCopy = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setString(children);
  };

  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLanguage}>{language || "code"}</Text>
        <Pressable onPress={handleCopy} hitSlop={8}>
          <Feather name="copy" size={13} color={Colors.textSecondary} />
        </Pressable>
      </View>
      <Text style={styles.codeText}>{children}</Text>
    </View>
  );
}

const markdownStyles = {
  body: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  heading1: {
    color: Colors.text,
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    marginTop: 8,
    marginBottom: 4,
  },
  heading2: {
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    marginTop: 6,
    marginBottom: 4,
  },
  heading3: {
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginTop: 4,
    marginBottom: 2,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 4,
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  list_item: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  code_inline: {
    backgroundColor: Colors.surface3,
    color: Colors.primaryLight,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  fence: {
    backgroundColor: "transparent",
    padding: 0,
    marginVertical: 0,
  },
  code_block: {
    backgroundColor: "transparent",
    padding: 0,
  },
  blockquote: {
    backgroundColor: Colors.surface2,
    borderLeftColor: Colors.primary,
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 4,
    borderRadius: 2,
  },
  hr: {
    backgroundColor: Colors.border,
    height: 1,
    marginVertical: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
  },
  th: {
    backgroundColor: Colors.surface2,
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
    padding: 8,
    borderColor: Colors.border,
  },
  td: {
    color: Colors.text,
    padding: 8,
    borderColor: Colors.border,
  },
  strong: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  em: {
    color: Colors.text,
    fontStyle: "italic" as const,
  },
  link: {
    color: Colors.primary,
  },
};

function MessageBubbleInner({ message }: Props) {
  const isUser = message.role === "user";

  const rules = {
    fence: (node: any, children: any, parent: any, styles: any) => {
      const content = node.content || "";
      const lang = node.sourceInfo || "";
      return <CodeBlock key={node.key} language={lang}>{content}</CodeBlock>;
    },
    code_block: (node: any) => {
      const content = node.content || "";
      return <CodeBlock key={node.key}>{content}</CodeBlock>;
    },
  };

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
    <View style={styles.assistantContainer}>
      <View style={styles.assistantIcon}>
        <Feather name="zap" size={13} color={Colors.primary} />
      </View>
      <View style={styles.assistantContent}>
        <Markdown style={markdownStyles} rules={rules}>
          {message.content || " "}
        </Markdown>
        {message.status === "error" && (
          <Text style={styles.errorText}>Failed to get response</Text>
        )}
        {message.status === "cancelled" && (
          <Text style={styles.cancelledText}>Cancelled</Text>
        )}
      </View>
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleInner);

const styles = StyleSheet.create({
  userContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "flex-end",
  },
  userBubble: {
    backgroundColor: Colors.userBubble,
    borderColor: Colors.userBubbleBorder,
    borderWidth: 1,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "85%",
  },
  userText: {
    color: Colors.text,
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
    backgroundColor: Colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  assistantContent: {
    flex: 1,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  cancelledText: {
    color: Colors.textTertiary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    fontStyle: "italic",
  },
  codeBlock: {
    backgroundColor: Colors.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface3,
  },
  codeLanguage: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  codeText: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 20,
    padding: 12,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
});
