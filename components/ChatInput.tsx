import React, { useRef, useState, useMemo } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/lib/useColors";
import { useTranslations } from "@/lib/useTranslations";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  onSend: (text: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  onCompanionPress?: () => void;
  activeCompanionColor?: string;
  activeCompanionIcon?: string;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
  onCompanionPress,
  activeCompanionColor,
  activeCompanionIcon,
}: Props) {
  const C = useColors();
  const t = useTranslations();
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C), [C]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  const handleStop = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStop?.();
  };

  const canSend = text.trim().length > 0 && !isStreaming && !disabled;

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
      <View style={styles.row}>
        {onCompanionPress && (
          <Pressable
            style={[
              styles.companionBtn,
              activeCompanionColor
                ? { backgroundColor: activeCompanionColor + "22", borderColor: activeCompanionColor + "55" }
                : {},
            ]}
            onPress={onCompanionPress}
          >
            <Feather
              name={(activeCompanionIcon as any) || "user"}
              size={16}
              color={activeCompanionColor || C.textTertiary}
            />
          </Pressable>
        )}
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
          ]}
        >
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t.messagePlaceholder}
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
            style={[styles.sendButton, canSend && styles.sendButtonActive]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Feather
              name="arrow-up"
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
      paddingTop: 12,
      paddingHorizontal: 12,
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
