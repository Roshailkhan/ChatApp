import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettingsContext, ThemeMode, ToneMode, VerbosityMode, ExpertiseLevel } from "@/contexts/SettingsContext";
import { useChatContext } from "@/contexts/ChatContext";
import { useMemory } from "@/contexts/MemoryContext";
import { useColors } from "@/lib/useColors";
import { useTranslations } from "@/lib/useTranslations";

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface ModelEntry {
  id: string;
  name: string;
  desc: string;
}

interface ProviderGroup {
  provider: string;
  label: string;
  color: string;
  models: ModelEntry[];
}

const THEMES: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "light", label: "Light", icon: "sun" },
  { value: "system", label: "System", icon: "monitor" },
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Chinese",
  "Japanese", "Arabic", "Russian", "Portuguese", "Hindi", "Korean", "Italian",
];

const MODEL_GROUPS: ProviderGroup[] = [
  {
    provider: "openrouter-open",
    label: "Open Source (via OpenRouter)",
    color: "#7C3AED",
    models: [
      { id: "deepseek/deepseek-chat", name: "DeepSeek V3", desc: "Strong reasoning, coding • 0.05x cost" },
      { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", desc: "Multilingual, balanced • 0.02x cost" },
      { id: "mistralai/mistral-small-3.1-24b-instruct", name: "Mistral Small 24B", desc: "Fast, efficient • 0.01x cost" },
      { id: "mistralai/mistral-7b-instruct", name: "Mistral 7B", desc: "Ultra-fast, lightweight • free" },
    ],
  },
  {
    provider: "openrouter-closed",
    label: "Premium (via OpenRouter)",
    color: "#EC4899",
    models: [
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", desc: "Nuanced writing, long context • 1.0x" },
      { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", desc: "Fast, multilingual • 0.8x cost" },
    ],
  },
  {
    provider: "openai",
    label: "OpenAI",
    color: "#10A37F",
    models: [
      { id: "gpt-4o", name: "GPT-4o", desc: "Broad knowledge, multimodal • 1.0x" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", desc: "Fast, lightweight • 0.2x" },
      { id: "gpt-4.1", name: "GPT-4.1", desc: "Latest generation • 1.0x" },
      { id: "o3-mini", name: "o3 Mini", desc: "Advanced reasoning • 1.0x" },
    ],
  },
  {
    provider: "groq",
    label: "Groq (Speed-Optimized)",
    color: "#F55036",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", desc: "Most capable, fast" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", desc: "Fastest responses" },
      { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", desc: "Latest Llama" },
      { id: "compound-beta", name: "Compound Beta", desc: "Web search + tools" },
      { id: "compound-beta-mini", name: "Compound Mini", desc: "Fast web search" },
    ],
  },
];

export function SettingsSheet({ visible, onClose }: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { appSettings, updateAppSettings } = useSettingsContext();
  const { settings, updateSettings } = useChatContext();
  const { memories, deleteMemory, clearAllMemories } = useMemory();

  const t = useTranslations();
  const styles = useMemo(() => createStyles(C), [C]);

  const themeLabels: Record<string, string> = {
    dark: t.dark,
    light: t.light,
    system: t.system,
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.settings}</Text>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.theme}</Text>
            <View style={styles.card}>
              {THEMES.map((theme, i) => (
                <Pressable
                  key={theme.value}
                  style={[
                    styles.optionRow,
                    i < THEMES.length - 1 && styles.optionRowBorder,
                  ]}
                  onPress={() => updateAppSettings({ theme: theme.value })}
                >
                  <View style={styles.optionLeft}>
                    <Feather
                      name={theme.icon as any}
                      size={16}
                      color={appSettings.theme === theme.value ? C.primary : C.textSecondary}
                    />
                    <Text style={styles.optionText}>{themeLabels[theme.value]}</Text>
                  </View>
                  {appSettings.theme === theme.value && (
                    <Feather name="check" size={16} color={C.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.aiModel}</Text>
            {MODEL_GROUPS.map((group) => (
              <View key={group.provider} style={styles.providerBlock}>
                <View style={styles.providerHeader}>
                  <View style={[styles.providerDot, { backgroundColor: group.color }]} />
                  <Text style={styles.providerLabel}>{group.label}</Text>
                </View>
                <View style={styles.card}>
                  {group.models.map((m, i) => {
                    const isSelected = settings.model === m.id;
                    return (
                      <Pressable
                        key={m.id}
                        style={[
                          styles.optionRow,
                          i < group.models.length - 1 && styles.optionRowBorder,
                          isSelected && styles.optionRowSelected,
                        ]}
                        onPress={() => updateSettings({ model: m.id })}
                      >
                        <View style={styles.optionLeft}>
                          <View style={[styles.modelDot, { backgroundColor: group.color }]} />
                          <View>
                            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                              {m.name}
                            </Text>
                            <Text style={styles.optionDesc}>{m.desc}</Text>
                          </View>
                        </View>
                        {isSelected && (
                          <Feather name="check" size={16} color={C.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PERSONALIZATION</Text>
            <Text style={styles.sectionHint}>Customize how the AI communicates with you</Text>

            <Text style={styles.subLabel}>Tone</Text>
            <View style={styles.chipRow}>
              {(["formal", "casual", "friendly"] as ToneMode[]).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, appSettings.tone === t && styles.chipActive]}
                  onPress={() => updateAppSettings({ tone: t })}
                >
                  <Text style={[styles.chipText, appSettings.tone === t && styles.chipTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.subLabel}>Verbosity</Text>
            <View style={styles.chipRow}>
              {(["concise", "balanced", "detailed"] as VerbosityMode[]).map((v) => (
                <Pressable
                  key={v}
                  style={[styles.chip, appSettings.verbosity === v && styles.chipActive]}
                  onPress={() => updateAppSettings({ verbosity: v })}
                >
                  <Text style={[styles.chipText, appSettings.verbosity === v && styles.chipTextActive]}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.subLabel}>Expertise Level</Text>
            <View style={styles.chipRow}>
              {(["beginner", "intermediate", "expert"] as ExpertiseLevel[]).map((e) => (
                <Pressable
                  key={e}
                  style={[styles.chip, appSettings.expertiseLevel === e && styles.chipActive]}
                  onPress={() => updateAppSettings({ expertiseLevel: e })}
                >
                  <Text style={[styles.chipText, appSettings.expertiseLevel === e && styles.chipTextActive]}>
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PRIVACY</Text>
            <View style={styles.card}>
              <Pressable
                style={styles.optionRow}
                onPress={() => updateAppSettings({ redactionEnabled: !appSettings.redactionEnabled })}
              >
                <View style={styles.optionLeft}>
                  <Feather name="shield" size={16} color={appSettings.redactionEnabled ? C.primary : C.textSecondary} />
                  <View>
                    <Text style={styles.optionText}>Auto PII Redaction</Text>
                    <Text style={styles.optionDesc}>Masks emails, phones, IDs before sending</Text>
                  </View>
                </View>
                <View style={[styles.toggle, appSettings.redactionEnabled && styles.toggleOn]}>
                  <View style={[styles.toggleThumb, appSettings.redactionEnabled && styles.toggleThumbOn]} />
                </View>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>MEMORY ({memories.length})</Text>
              {memories.length > 0 && (
                <Pressable onPress={clearAllMemories} hitSlop={8}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </Pressable>
              )}
            </View>
            {memories.length === 0 ? (
              <View style={styles.memoryEmpty}>
                <Text style={styles.memoryEmptyText}>No memories saved yet. Long-press any AI message to save a memory.</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {memories.map((mem, i) => (
                  <View key={mem.id} style={[styles.memoryRow, i < memories.length - 1 && styles.optionRowBorder]}>
                    <Text style={styles.memoryText} numberOfLines={2}>{mem.text}</Text>
                    <Pressable onPress={() => deleteMemory(mem.id)} hitSlop={8}>
                      <Feather name="trash-2" size={14} color={C.error} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.language}</Text>
            <Text style={styles.sectionHint}>{t.aiRespondsIn}</Text>
            <View style={styles.card}>
              {LANGUAGES.map((lang, i) => (
                <Pressable
                  key={lang}
                  style={[
                    styles.optionRow,
                    i < LANGUAGES.length - 1 && styles.optionRowBorder,
                  ]}
                  onPress={() => updateAppSettings({ language: lang })}
                >
                  <Text style={styles.optionText}>{lang}</Text>
                  {appSettings.language === lang && (
                    <Feather name="check" size={16} color={C.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    headerTitle: {
      color: C.text,
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
    },
    closeBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      backgroundColor: C.surface2,
    },
    scroll: { flex: 1 },
    scrollContent: { padding: 20 },
    section: { marginBottom: 28 },
    sectionLabel: {
      color: C.textTertiary,
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.8,
      marginBottom: 8,
      marginLeft: 4,
    },
    sectionHint: {
      color: C.textTertiary,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      overflow: "hidden",
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    optionRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    optionRowSelected: {
      backgroundColor: C.surface2,
    },
    optionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    optionText: {
      color: C.text,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
    },
    optionTextSelected: {
      fontFamily: "Inter_500Medium",
    },
    optionDesc: {
      color: C.textTertiary,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
    },
    providerBlock: {
      marginBottom: 12,
    },
    providerHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
      marginLeft: 4,
    },
    providerDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    providerLabel: {
      color: C.textSecondary,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    modelDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 1,
    },
    toggle: {
      width: 44,
      height: 26,
      borderRadius: 13,
      backgroundColor: C.surface3,
      borderWidth: 1,
      borderColor: C.border,
      justifyContent: "center",
      paddingHorizontal: 2,
    },
    toggleOn: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: C.textTertiary,
    },
    toggleThumbOn: {
      backgroundColor: "#fff",
      alignSelf: "flex-end",
    },
    subLabel: {
      color: C.textSecondary,
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      marginTop: 12,
      marginBottom: 6,
      marginLeft: 2,
    },
    chipRow: {
      flexDirection: "row",
      gap: 8,
      flexWrap: "wrap",
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
    },
    chipActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    chipText: {
      color: C.textSecondary,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    chipTextActive: {
      color: "#fff",
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
      marginHorizontal: 4,
    },
    clearAllText: {
      color: C.error,
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
    memoryEmpty: {
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
    },
    memoryEmptyText: {
      color: C.textTertiary,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
    },
    memoryRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    memoryText: {
      flex: 1,
      color: C.text,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
    },
  });
}
