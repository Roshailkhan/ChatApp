import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/lib/useColors";
import { PROMPTS, PROMPT_CATEGORIES, Prompt } from "@/lib/prompts";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (text: string) => void;
}

export function PromptLibrarySheet({ visible, onClose, onSelect }: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C), [C]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = PROMPTS;
    if (selectedCategory !== "All") {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.text.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedCategory, search]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  function handleSelect(prompt: Prompt) {
    onSelect(prompt.text);
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
          <Text style={styles.headerTitle}>Prompt Library</Text>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Feather name="search" size={14} color={C.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search prompts..."
            placeholderTextColor={C.textTertiary}
            selectionColor={C.primary}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x-circle" size={14} color={C.textTertiary} />
            </Pressable>
          )}
        </View>

        <FlatList
          horizontal
          data={PROMPT_CATEGORIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          style={styles.categoryList}
          contentContainerStyle={styles.categoryContent}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.categoryChip, selectedCategory === item && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[styles.categoryText, selectedCategory === item && styles.categoryTextActive]}>
                {item}
              </Text>
            </Pressable>
          )}
        />
        <View style={styles.divider} />

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          style={styles.promptList}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable style={styles.promptCard} onPress={() => handleSelect(item)}>
              <View style={styles.promptHeader}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category}</Text>
                </View>
                <Feather name="chevron-right" size={14} color={C.textTertiary} />
              </View>
              <Text style={styles.promptTitle}>{item.title}</Text>
              <Text style={styles.promptPreview} numberOfLines={2}>
                {item.text}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="inbox" size={32} color={C.textTertiary} />
              <Text style={styles.emptyText}>No prompts found</Text>
            </View>
          }
        />
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
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: C.surface2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    searchIcon: {},
    searchInput: {
      flex: 1,
      color: C.text,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      padding: 0,
      ...(Platform.OS === "web" ? { outlineWidth: 0, outlineStyle: "none" } as any : {}),
    },
    categoryList: {
      flexGrow: 0,
      flexShrink: 0,
      height: 48,
      marginTop: 8,
    },
    categoryContent: {
      paddingHorizontal: 16,
      gap: 8,
      alignItems: "center",
    },
    categoryChip: {
      height: 36,
      paddingHorizontal: 16,
      borderRadius: 18,
      backgroundColor: C.surface2,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryChipActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    categoryText: {
      color: C.textSecondary,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    categoryTextActive: {
      color: "#fff",
    },
    divider: {
      height: 1,
      backgroundColor: C.border,
      marginTop: 6,
    },
    promptList: {
      flex: 1,
    },
    listContent: {
      padding: 16,
      paddingTop: 8,
      gap: 10,
      paddingBottom: 32,
    },
    promptCard: {
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
    },
    promptHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    categoryBadge: {
      backgroundColor: C.surface2,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    categoryBadgeText: {
      color: C.textSecondary,
      fontSize: 11,
      fontFamily: "Inter_500Medium",
    },
    promptTitle: {
      color: C.text,
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 4,
    },
    promptPreview: {
      color: C.textTertiary,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
    },
    empty: {
      alignItems: "center",
      marginTop: 60,
      gap: 12,
    },
    emptyText: {
      color: C.textTertiary,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
  });
}
