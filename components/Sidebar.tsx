import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Modal,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConversationItem } from "@/components/ConversationItem";
import { SettingsSheet } from "@/components/SettingsSheet";
import { Conversation, useChatContext } from "@/contexts/ChatContext";
import { useColors } from "@/lib/useColors";
import { useTranslations } from "@/lib/useTranslations";
import * as Haptics from "expo-haptics";

interface Props {
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
}

export function Sidebar({
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onClose,
}: Props) {
  const C = useColors();
  const t = useTranslations();
  const { conversations, deleteConversation, renameConversation } =
    useChatContext();
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C), [C]);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleRename = (conv: Conversation) => {
    setRenamingId(conv.id);
    setRenameText(conv.title);
  };

  const submitRename = async () => {
    if (!renamingId || !renameText.trim()) return;
    await renameConversation(renamingId, renameText.trim());
    setRenamingId(null);
    setRenameText("");
  };

  const handleDelete = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await deleteConversation(id);
    if (id === activeConversationId) {
      if (conversations.length > 1) {
        const next = conversations.find((c) => c.id !== id);
        if (next) onSelectConversation(next.id);
      } else {
        onNewChat();
      }
    }
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.conversations}</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => setShowSettings(true)}
          >
            <Feather name="settings" size={17} color={C.textSecondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={onNewChat}>
            <Feather name="edit" size={18} color={C.text} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={onClose}>
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <Feather
          name="search"
          size={14}
          color={C.textTertiary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t.search}
          placeholderTextColor={C.textTertiary}
          selectionColor={C.primary}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            isActive={item.id === activeConversationId}
            onPress={() => onSelectConversation(item.id)}
            onDelete={() => handleDelete(item.id)}
            onRename={() => handleRename(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t.noConversationsYet}</Text>
          </View>
        }
      />

      <Modal
        visible={!!renamingId}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamingId(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setRenamingId(null)}
        />
        <View style={styles.renameModal}>
          <Text style={styles.renameTitle}>{t.renameConversation}</Text>
          <TextInput
            style={styles.renameInput}
            value={renameText}
            onChangeText={setRenameText}
            placeholder={t.conversationTitle}
            placeholderTextColor={C.textTertiary}
            selectionColor={C.primary}
            autoFocus
            onSubmitEditing={submitRename}
            returnKeyType="done"
          />
          <View style={styles.renameActions}>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => setRenamingId(null)}
            >
              <Text style={styles.cancelText}>{t.cancel}</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={submitRename}>
              <Text style={styles.saveText}>{t.save}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <SettingsSheet
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </View>
  );
}

function createStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    title: {
      color: C.text,
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    headerActions: {
      flexDirection: "row",
      gap: 4,
    },
    iconBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      margin: 12,
      backgroundColor: C.surface2,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 10,
    },
    searchIcon: {
      marginRight: 6,
    },
    searchInput: {
      flex: 1,
      color: C.text,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      paddingVertical: 8,
    },
    listContent: {
      paddingBottom: 20,
    },
    empty: {
      alignItems: "center",
      marginTop: 40,
    },
    emptyText: {
      color: C.textTertiary,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    modalOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)",
    },
    renameModal: {
      position: "absolute",
      left: 24,
      right: 24,
      top: "40%",
      backgroundColor: C.surface2,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: C.border,
    },
    renameTitle: {
      color: C.text,
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 16,
    },
    renameInput: {
      backgroundColor: C.surface3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: C.text,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      marginBottom: 16,
    },
    renameActions: {
      flexDirection: "row",
      gap: 10,
      justifyContent: "flex-end",
    },
    cancelBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: C.surface3,
    },
    cancelText: {
      color: C.textSecondary,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
    },
    saveBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: C.primary,
    },
    saveText: {
      color: "#fff",
      fontSize: 14,
      fontFamily: "Inter_500Medium",
    },
  });
}
