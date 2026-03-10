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

interface Props {
  visible: boolean;
  onClose: () => void;
}

const THEMES: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "light", label: "Light", icon: "sun" },
  { value: "system", label: "System", icon: "monitor" },
];

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Chinese",
  "Japanese",
  "Arabic",
  "Russian",
  "Portuguese",
  "Hindi",
  "Korean",
  "Italian",
];

const AI_MODELS: { id: string; name: string; desc: string }[] = [
  { id: "gpt-4.1", name: "GPT-4.1", desc: "Most capable" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", desc: "Fast & efficient" },
  { id: "gpt-4o", name: "GPT-4o", desc: "Powerful" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", desc: "Affordable" },
  { id: "gpt-5.2", name: "GPT-5.2", desc: "Latest" },
  { id: "o3-mini", name: "o3 Mini", desc: "Reasoning" },
];

export function SettingsSheet({ visible, onClose }: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { appSettings, updateAppSettings } = useSettingsContext();
  const { settings, updateSettings } = useChatContext();

  const styles = useMemo(() => createStyles(C), [C]);

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
          <Text style={styles.headerTitle}>Settings</Text>
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
            <Text style={styles.sectionLabel}>THEME</Text>
            <View style={styles.card}>
              {THEMES.map((t, i) => (
                <Pressable
                  key={t.value}
                  style={[
                    styles.optionRow,
                    i < THEMES.length - 1 && styles.optionRowBorder,
                  ]}
                  onPress={() => updateAppSettings({ theme: t.value })}
                >
                  <View style={styles.optionLeft}>
                    <Feather
                      name={t.icon as any}
                      size={16}
                      color={
                        appSettings.theme === t.value
                          ? C.primary
                          : C.textSecondary
                      }
                    />
                    <Text style={styles.optionText}>{t.label}</Text>
                  </View>
                  {appSettings.theme === t.value && (
                    <Feather name="check" size={16} color={C.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>AI MODEL</Text>
            <View style={styles.card}>
              {AI_MODELS.map((m, i) => (
                <Pressable
                  key={m.id}
                  style={[
                    styles.optionRow,
                    i < AI_MODELS.length - 1 && styles.optionRowBorder,
                  ]}
                  onPress={() => updateSettings({ model: m.id })}
                >
                  <View style={styles.optionLeft}>
                    <Feather
                      name="cpu"
                      size={16}
                      color={
                        settings.model === m.id ? C.primary : C.textSecondary
                      }
                    />
                    <View>
                      <Text style={styles.optionText}>{m.name}</Text>
                      <Text style={styles.optionDesc}>{m.desc}</Text>
                    </View>
                  </View>
                  {settings.model === m.id && (
                    <Feather name="check" size={16} color={C.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>LANGUAGE</Text>
            <Text style={styles.sectionHint}>
              AI will respond in the selected language
            </Text>
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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    section: {
      marginBottom: 28,
    },
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
    optionDesc: {
      color: C.textTertiary,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
    },
  });
}
