import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/lib/useColors";
import { useSpaces, Space } from "@/contexts/SpacesContext";

const SPACE_MODELS = [
  { id: "", label: "Auto (Global Default)", desc: "" },
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", desc: "Fast, versatile" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek V3", desc: "Strong reasoning" },
  { id: "gpt-4o", label: "GPT-4o", desc: "Broad knowledge" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", desc: "Nuanced writing" },
  { id: "compound-beta", label: "Compound Beta", desc: "Web search + tools" },
  { id: "mistralai/mistral-small-3.1-24b-instruct", label: "Mistral 24B", desc: "Efficient, balanced" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  editingSpace?: Space | null;
}

const EMOJI_OPTIONS = ["🚀", "💼", "📚", "🎯", "💡", "🔬", "💰", "🎨", "🏥", "⚡", "🌍", "🛠️", "📊", "✍️", "🧠"];

export function SpaceSheet({ visible, onClose, editingSpace }: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C), [C]);
  const { createSpace, updateSpace } = useSpaces();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🚀");
  const [context, setContext] = useState("");
  const [instructions, setInstructions] = useState("");
  const [defaultModel, setDefaultModel] = useState("");

  useEffect(() => {
    if (editingSpace) {
      setName(editingSpace.name);
      setEmoji(editingSpace.emoji);
      setContext(editingSpace.context);
      setInstructions(editingSpace.instructions);
      setDefaultModel(editingSpace.defaultModel || "");
    } else {
      setName("");
      setEmoji("🚀");
      setContext("");
      setInstructions("");
      setDefaultModel("");
    }
  }, [editingSpace, visible]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  async function handleSave() {
    if (!name.trim()) return;
    if (editingSpace) {
      await updateSpace(editingSpace.id, { name: name.trim(), emoji, context, instructions, defaultModel });
    } else {
      await createSpace({ name: name.trim(), emoji, context, instructions, defaultModel });
    }
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{editingSpace ? "Edit Space" : "New Space"}</Text>
          <Pressable
            style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!name.trim()}
          >
            <Text style={[styles.saveText, !name.trim() && styles.saveTextDisabled]}>
              {editingSpace ? "Save" : "Create"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.emojiRow}>
            <View style={styles.emojiPreview}>
              <Text style={styles.emojiPreviewText}>{emoji}</Text>
            </View>
            <View style={styles.emojiOptions}>
              {EMOJI_OPTIONS.map((e) => (
                <Pressable
                  key={e}
                  style={[styles.emojiOption, emoji === e && styles.emojiOptionActive]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={styles.emojiOptionText}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>SPACE NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Work Project, Research"
              placeholderTextColor={C.textTertiary}
              selectionColor={C.primary}
              maxLength={50}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>BACKGROUND CONTEXT</Text>
            <Text style={styles.fieldHint}>Persistent information the AI will always know in this space</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={context}
              onChangeText={setContext}
              placeholder="e.g. I'm building a SaaS app for healthcare providers. Tech stack: React, Node.js, PostgreSQL."
              placeholderTextColor={C.textTertiary}
              selectionColor={C.primary}
              multiline
              numberOfLines={4}
              maxLength={2000}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>AI INSTRUCTIONS</Text>
            <Text style={styles.fieldHint}>How the AI should behave in this space</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="e.g. Always respond with code examples. Use TypeScript. Focus on production-ready solutions."
              placeholderTextColor={C.textTertiary}
              selectionColor={C.primary}
              multiline
              numberOfLines={4}
              maxLength={2000}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DEFAULT MODEL</Text>
            <Text style={styles.fieldHint}>Model used for all threads in this space</Text>
            <View style={styles.modelList}>
              {SPACE_MODELS.map((m, i) => {
                const isSelected = defaultModel === m.id;
                return (
                  <Pressable
                    key={m.id || "auto"}
                    style={[
                      styles.modelRow,
                      i < SPACE_MODELS.length - 1 && styles.modelRowBorder,
                      isSelected && styles.modelRowSelected,
                    ]}
                    onPress={() => setDefaultModel(m.id)}
                  >
                    <View>
                      <Text style={[styles.modelRowLabel, isSelected && styles.modelRowLabelActive]}>{m.label}</Text>
                      {m.desc ? <Text style={styles.modelRowDesc}>{m.desc}</Text> : null}
                    </View>
                    {isSelected && <Feather name="check" size={16} color={C.primary} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    headerTitle: {
      color: C.text,
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    cancelBtn: { padding: 4 },
    cancelText: { color: C.textSecondary, fontSize: 15, fontFamily: "Inter_400Regular" },
    saveBtn: {
      backgroundColor: C.primary,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    saveBtnDisabled: { backgroundColor: C.surface3 },
    saveText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
    saveTextDisabled: { color: C.textTertiary },
    scroll: { flex: 1 },
    scrollContent: { padding: 20, gap: 20 },
    emojiRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
    emojiPreview: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: C.surface2,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    emojiPreviewText: { fontSize: 32 },
    emojiOptions: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    emojiOption: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surface2,
      borderWidth: 1,
      borderColor: C.border,
    },
    emojiOptionActive: {
      borderColor: C.primary,
      backgroundColor: C.primary + "22",
    },
    emojiOptionText: { fontSize: 20 },
    fieldGroup: { gap: 6 },
    fieldLabel: {
      color: C.textTertiary,
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.8,
    },
    fieldHint: {
      color: C.textTertiary,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    input: {
      backgroundColor: C.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: C.text,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      ...(Platform.OS === "web" ? { outlineWidth: 0, outlineStyle: "none" } as any : {}),
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: "top",
    },
    modelList: {
      backgroundColor: C.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      overflow: "hidden",
    },
    modelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    modelRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    modelRowSelected: {
      backgroundColor: C.surface2,
    },
    modelRowLabel: {
      color: C.text,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    modelRowLabelActive: {
      fontFamily: "Inter_500Medium",
      color: C.primary,
    },
    modelRowDesc: {
      color: C.textTertiary,
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
    },
  });
}
