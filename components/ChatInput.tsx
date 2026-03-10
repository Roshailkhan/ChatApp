import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  onSend: (text: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: Props) {
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

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
            placeholder="Message AI Chat..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={4000}
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
            editable={!disabled}
            selectionColor={Colors.primary}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </View>

        {isStreaming ? (
          <Pressable
            style={[styles.sendButton, styles.stopButton]}
            onPress={handleStop}
          >
            <Feather name="square" size={16} color={Colors.text} />
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
              color={canSend ? "#fff" : Colors.textTertiary}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
  },
  input: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    padding: 0,
    ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  stopButton: {
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
