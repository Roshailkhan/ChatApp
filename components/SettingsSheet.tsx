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
import { useSettingsContext, ThemeMode } from "@/contexts/SettingsContext";
import { useChatContext } from "@/contexts/ChatContext";
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
    provider: "groq",
    label: "Groq",
    color: "#F55036",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", desc: "Most capable" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", desc: "Fastest" },
      { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", desc: "Latest" },
      { id: "compound-beta", name: "Compound Beta", desc: "Multi-tool" },
      { id: "compound-beta-mini", name: "Compound Mini", desc: "Fast multi-tool" },
    ],
  },
  {
    provider: "openai",
    label: "OpenAI",
    color: "#10A37F",
    models: [
      { id: "gpt-4.1", name: "GPT-4.1", desc: "Most capable" },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", desc: "Fast" },
      { id: "gpt-4o", name: "GPT-4o", desc: "Powerful" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", desc: "Lightweight" },
      { id: "o3-mini", name: "o3 Mini", desc: "Reasoning" },
    ],
  },
];

export function SettingsSheet({ visible, onClose }: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { appSettings, updateAppSettings } = useSettingsContext();
  const { settings, updateSettings } = useChatContext();

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
  });
}
