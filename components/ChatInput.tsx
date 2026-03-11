import React, { useRef, useState, useMemo } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/lib/useColors";
import { useTranslations } from "@/lib/useTranslations";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ChatMode = "chat" | "search" | "research";

interface Props {
  onSend: (text: string, mode: ChatMode) => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  onCompanionPress?: () => void;
  activeCompanionColor?: string;
  activeCompanionIcon?: string;
  onPromptLibraryPress?: () => void;
  fillText?: string;
  onFillTextConsumed?: () => void;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
  onCompanionPress,
  activeCompanionColor,
  activeCompanionIcon,
  onPromptLibraryPress,
  fillText,
  onFillTextConsumed,
}: Props) {
  const C = useColors();
  const t = useTranslations();
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [mode, setMode] = useState<ChatMode>("chat");
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C), [C]);

  React.useEffect(() => {
    if (fillText) {
      setText(fillText);
      onFillTextConsumed?.();
      inputRef.current?.focus();
    }
  }, [fillText]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed, mode);
    setText("");
    inputRef.current?.focus();
  };

  const handleStop = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStop?.();
  };

  const toggleMode = (newMode: ChatMode) => {
    setMode((prev) => (prev === newMode ? "chat" : newMode));
  };

  const canSend = text.trim().length > 0 && !isStreaming && !disabled;

  const modeColor = mode === "search" ? "#3B82F6" : mode === "research" ? "#8B5CF6" : C.primary;
  const placeholder =
    mode === "search"
      ? "Search the web..."
      : mode === "research"
      ? "Deep research topic..."
      : t.messagePlaceholder;

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom:
            Platform.OS === "web"
              ? 34
              : insets.bottom > 0
              ? insets.bottom + 4
              : 12,
        },
      ]}
    >
      <View style={styles.modeRow}>
        {onCompanionPress && (
          <Pressable
            style={[
              styles.modeBtn,
              activeCompanionColor
                ? { backgroundColor: activeCompanionColor + "22", borderColor: activeCompanionColor + "55" }
                : {},
            ]}
            onPress={onCompanionPress}
            testID="companion-mode-btn"
          >
            <Feather
              name={(activeCompanionIcon as any) || "user"}
              size={14}
              color={activeCompanionColor || C.textTertiary}
            />
          </Pressable>
        )}
        <Pressable
          style={[styles.modeBtn, mode === "search" && { backgroundColor: "#3B82F622", borderColor: "#3B82F655" }]}
          onPress={() => toggleMode("search")}
          testID="search-mode-btn"
        >
          <Feather name="globe" size={14} color={mode === "search" ? "#3B82F6" : C.textTertiary} />
        </Pressable>
        <Pressable
          style={[styles.modeBtn, mode === "research" && { backgroundColor: "#8B5CF622", borderColor: "#8B5CF655" }]}
          onPress={() => toggleMode("research")}
          testID="research-mode-btn"
        >
          <Feather name="layers" size={14} color={mode === "research" ? "#8B5CF6" : C.textTertiary} />
        </Pressable>
        {onPromptLibraryPress && (
          <Pressable style={styles.modeBtn} onPress={onPromptLibraryPress} testID="prompt-library-btn">
            <Feather name="book-open" size={14} color={C.textTertiary} />
          </Pressable>
        )}
        {(mode === "search" || mode === "research") && (
          <View style={[styles.modeBadge, { backgroundColor: modeColor + "22" }]}>
            <Text style={[styles.modeBadgeText, { color: modeColor }]}>
              {mode === "search" ? "Web Search" : "Deep Research"}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.row}>
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
            mode !== "chat" && { borderColor: modeColor + "66" },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={C.textTertiary}
            multiline
            maxLength={4000}
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
            editable={!disabled}
            selectionColor={C.primary}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </View>

        {isStreaming ? (
          <Pressable
            style={[styles.sendButton, styles.stopButton]}
            onPress={handleStop}
          >
            <Feather name="square" size={16} color={C.text} />
          </Pressable>
        ) : (
          <Pressable
            style={[styles.sendButton, canSend && { backgroundColor: modeColor }]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Feather
              name={mode === "search" ? "globe" : mode === "research" ? "layers" : "arrow-up"}
              size={18}
              color={canSend ? "#fff" : C.textTertiary}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function createStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: C.background,
      borderTopWidth: 1,
      borderTopColor: C.border,
      paddingTop: 10,
      paddingHorizontal: 12,
    },
    modeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    modeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: C.surface2,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    modeBadge: {
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    modeBadgeText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },
    companionBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: C.surface2,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    inputContainer: {
      flex: 1,
      backgroundColor: C.surface2,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
      minHeight: 44,
      maxHeight: 120,
    },
    inputContainerFocused: {
      borderColor: "#ffffff",
    },
    input: {
      color: C.text,
      fontSize: 15,
      lineHeight: 22,
      fontFamily: "Inter_400Regular",
      padding: 0,
      ...(Platform.OS === "web"
        ? { outlineWidth: 0, outlineStyle: "none", borderWidth: 0 }
        : {}),
    },
    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: C.surface2,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    sendButtonActive: {
      backgroundColor: C.primary,
    },
    stopButton: {
      backgroundColor: C.surface3,
      borderWidth: 1,
      borderColor: C.border,
    },
  });
}
