import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConversationItem } from "@/components/ConversationItem";
import { SettingsSheet } from "@/components/SettingsSheet";
import { CompanionsSheet } from "@/components/CompanionsSheet";
import { SpaceSheet } from "@/components/SpaceSheet";
import { Conversation, useChatContext } from "@/contexts/ChatContext";
import { useCompanions } from "@/contexts/CompanionsContext";
import { useSpaces, Space } from "@/contexts/SpacesContext";
import { useColors } from "@/lib/useColors";
import { useTranslations } from "@/lib/useTranslations";
import * as Haptics from "expo-haptics";

interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  snippet: string;
  role: "user" | "assistant";
}

interface Props {
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: (spaceId?: string) => void;
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
  const { conversations, deleteConversation, renameConversation, getSpaceConversations, getMessages } = useChatContext();
  const { companions, activeCompanionId, setActiveCompanion } = useCompanions();
  const { spaces, activeSpaceId, setActiveSpace, deleteSpace } = useSpaces();
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showCompanions, setShowCompanions] = useState(false);
  const [showSpaceSheet, setShowSpaceSheet] = useState(false);
  const [viewingSpaceId, setViewingSpaceId] = useState<string | null>(null);
  const [threadSearch, setThreadSearch] = useState("");
  const [crossThreadResults, setCrossThreadResults] = useState<SearchResult[]>([]);
  const [crossThreadSearching, setCrossThreadSearching] = useState(false);
  const [crossThreadQuery, setCrossThreadQuery] = useState("");
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C), [C]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const viewingSpace = viewingSpaceId ? spaces.find((s) => s.id === viewingSpaceId) : null;

  const allFiltered = conversations.filter((c) =>
    !c.spaceId && c.title.toLowerCase().includes(search.toLowerCase())
  );

  const spaceFiltered = viewingSpace
    ? getSpaceConversations(viewingSpace.id).filter((c) =>
        c.title.toLowerCase().includes(threadSearch.toLowerCase())
      )
    : [];

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
    const remaining = viewingSpace
      ? getSpaceConversations(viewingSpace.id).filter((c) => c.id !== id)
      : conversations.filter((c) => !c.spaceId && c.id !== id);
    if (id === activeConversationId) {
      if (remaining.length > 0) {
        onSelectConversation(remaining[0].id);
      } else {
        onNewChat(viewingSpace?.id);
      }
    }
  };

  const handleCrossThreadSearch = useCallback(async (query: string) => {
    if (!viewingSpace || !query.trim()) {
      setCrossThreadResults([]);
      return;
    }
    setCrossThreadSearching(true);
    const spaceConvs = getSpaceConversations(viewingSpace.id);
    const results: SearchResult[] = [];
    const q = query.toLowerCase();

    await Promise.all(
      spaceConvs.map(async (conv) => {
        try {
          const msgs = await getMessages(conv.id);
          for (const msg of msgs) {
            if (msg.role === "system") continue;
            const idx = msg.content.toLowerCase().indexOf(q);
            if (idx !== -1) {
              const start = Math.max(0, idx - 40);
              const end = Math.min(msg.content.length, idx + query.length + 80);
              const snippet = (start > 0 ? "…" : "") + msg.content.slice(start, end) + (end < msg.content.length ? "…" : "");
              results.push({
                conversationId: conv.id,
                conversationTitle: conv.title,
                snippet,
                role: msg.role as "user" | "assistant",
              });
              break;
            }
          }
        } catch {}
      })
    );

    setCrossThreadResults(results);
    setCrossThreadSearching(false);
  }, [viewingSpace, getSpaceConversations, getMessages]);

  if (viewingSpace) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => { setThreadSearch(""); setCrossThreadResults([]); setCrossThreadQuery(""); setViewingSpaceId(null); }}>
            <Feather name="chevron-left" size={18} color={C.text} />
          </Pressable>
          <View style={styles.spaceHeaderCenter}>
            <Text style={styles.spaceHeaderEmoji}>{viewingSpace.emoji}</Text>
            <Text style={styles.spaceHeaderName} numberOfLines={1}>{viewingSpace.name}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconBtn} onPress={() => onNewChat(viewingSpace.id)}>
              <Feather name="edit" size={17} color={C.text} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={onClose}>
              <Feather name="x" size={20} color={C.text} />
            </Pressable>
          </View>
        </View>

        {viewingSpace.context ? (
          <View style={styles.spaceContextBar}>
            <Text style={styles.spaceContextText} numberOfLines={2}>{viewingSpace.context}</Text>
          </View>
        ) : null}

        <View style={styles.searchRow}>
          <Feather name="search" size={14} color={C.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={threadSearch}
            onChangeText={(v) => {
              setThreadSearch(v);
              if (v.trim().length > 1) {
                setCrossThreadQuery(v);
                handleCrossThreadSearch(v);
              } else {
                setCrossThreadResults([]);
                setCrossThreadQuery("");
              }
            }}
            placeholder="Search threads & messages..."
            placeholderTextColor={C.textTertiary}
            selectionColor={C.primary}
          />
          {threadSearch.length > 0 && (
            <Pressable onPress={() => { setThreadSearch(""); setCrossThreadResults([]); setCrossThreadQuery(""); }} hitSlop={8}>
              <Feather name="x" size={14} color={C.textTertiary} />
            </Pressable>
          )}
        </View>

        {crossThreadQuery.trim().length > 1 ? (
          <View style={styles.crossThreadContainer}>
            {crossThreadSearching ? (
              <View style={styles.crossThreadLoading}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={styles.crossThreadLoadingText}>Searching all threads...</Text>
              </View>
            ) : crossThreadResults.length === 0 ? (
              <View style={styles.crossThreadEmpty}>
                <Text style={styles.crossThreadEmptyText}>No messages found for "{crossThreadQuery}"</Text>
              </View>
            ) : (
              <>
                <Text style={styles.crossThreadHeader}>
                  {crossThreadResults.length} result{crossThreadResults.length !== 1 ? "s" : ""} across threads
                </Text>
                <FlatList
                  data={crossThreadResults}
                  keyExtractor={(item, i) => `${item.conversationId}-${i}`}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.crossThreadResult}
                      onPress={() => { onSelectConversation(item.conversationId); onClose(); }}
                    >
                      <View style={styles.crossThreadResultHeader}>
                        <Feather name={item.role === "assistant" ? "zap" : "user"} size={11} color={C.textTertiary} />
                        <Text style={styles.crossThreadConvTitle} numberOfLines={1}>{item.conversationTitle}</Text>
                      </View>
                      <Text style={styles.crossThreadSnippet} numberOfLines={2}>{item.snippet}</Text>
                    </Pressable>
                  )}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}
          </View>
        ) : (
          <FlatList
            data={spaceFiltered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ConversationItem
                conversation={item}
                isActive={item.id === activeConversationId}
                onPress={() => { onSelectConversation(item.id); onClose(); }}
                onDelete={() => handleDelete(item.id)}
                onRename={() => handleRename(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No threads yet. Tap the pencil to start one.</Text>
              </View>
            }
          />
        )}

        <Modal visible={!!renamingId} transparent animationType="fade" onRequestClose={() => setRenamingId(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setRenamingId(null)} />
          <View style={styles.renameModal}>
            <Text style={styles.renameTitle}>{t.renameConversation}</Text>
            <TextInput
              style={styles.renameInput}
              value={renameText} onChangeText={setRenameText}
              placeholder={t.conversationTitle}
              placeholderTextColor={C.textTertiary} selectionColor={C.primary}
              autoFocus onSubmitEditing={submitRename} returnKeyType="done"
            />
            <View style={styles.renameActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setRenamingId(null)}>
                <Text style={styles.cancelText}>{t.cancel}</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={submitRename}>
                <Text style={styles.saveText}>{t.save}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.conversations}</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => setShowSettings(true)} testID="sidebar-settings-btn">
            <Feather name="settings" size={17} color={C.textSecondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => onNewChat()}>
            <Feather name="edit" size={18} color={C.text} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={onClose}>
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.companionsRow} onPress={() => setShowCompanions(true)}>
        <View style={styles.companionsLeft}>
          <Feather name="users" size={15} color={activeCompanionId ? C.primary : C.textSecondary} />
          <Text style={[styles.companionsText, activeCompanionId && styles.companionsTextActive]}>
            {activeCompanionId
              ? companions.find((c) => c.id === activeCompanionId)?.name || "Companion"
              : "Companions"}
          </Text>
        </View>
        {activeCompanionId ? (
          <Pressable onPress={(e) => { e.stopPropagation(); setActiveCompanion(null); }} hitSlop={8}>
            <Feather name="x" size={14} color={C.textTertiary} />
          </Pressable>
        ) : (
          <Feather name="chevron-right" size={14} color={C.textTertiary} />
        )}
      </Pressable>

      <View style={styles.spacesSection}>
        <View style={styles.spacesSectionHeader}>
          <Text style={styles.spacesSectionTitle}>SPACES</Text>
          <Pressable style={styles.spacesAddBtn} onPress={() => setShowSpaceSheet(true)}>
            <Feather name="plus" size={14} color={C.primary} />
          </Pressable>
        </View>
        {spaces.length === 0 ? (
          <Pressable style={styles.spacesEmpty} onPress={() => setShowSpaceSheet(true)}>
            <Text style={styles.spacesEmptyText}>Create a space for organized chats</Text>
          </Pressable>
        ) : (
          <View style={styles.spacesList}>
            {spaces.map((space) => (
              <Pressable
                key={space.id}
                style={[styles.spaceItem, activeSpaceId === space.id && styles.spaceItemActive]}
                onPress={() => {
                  setActiveSpace(activeSpaceId === space.id ? null : space.id);
                  setViewingSpaceId(space.id);
                  setSearch("");
                  setThreadSearch("");
                  setCrossThreadResults([]);
                  setCrossThreadQuery("");
                }}
              >
                <Text style={styles.spaceItemEmoji}>{space.emoji}</Text>
                <Text style={[styles.spaceItemName, activeSpaceId === space.id && styles.spaceItemNameActive]} numberOfLines={1}>
                  {space.name}
                </Text>
                <Feather name="chevron-right" size={12} color={C.textTertiary} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.searchRow}>
        <Feather name="search" size={14} color={C.textTertiary} style={styles.searchIcon} />
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
        data={allFiltered}
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

      <Modal visible={!!renamingId} transparent animationType="fade" onRequestClose={() => setRenamingId(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRenamingId(null)} />
        <View style={styles.renameModal}>
          <Text style={styles.renameTitle}>{t.renameConversation}</Text>
          <TextInput
            style={styles.renameInput}
            value={renameText} onChangeText={setRenameText}
            placeholder={t.conversationTitle}
            placeholderTextColor={C.textTertiary} selectionColor={C.primary}
            autoFocus onSubmitEditing={submitRename} returnKeyType="done"
          />
          <View style={styles.renameActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setRenamingId(null)}>
              <Text style={styles.cancelText}>{t.cancel}</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={submitRename}>
              <Text style={styles.saveText}>{t.save}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <SettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />
      <CompanionsSheet visible={showCompanions} onClose={() => setShowCompanions(false)} />
      <SpaceSheet visible={showSpaceSheet} onClose={() => setShowSpaceSheet(false)} />
    </View>
  );
}

function createStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.surface },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    title: { color: C.text, fontSize: 16, fontFamily: "Inter_600SemiBold" },
    headerActions: { flexDirection: "row", gap: 4 },
    iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 8 },
    backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 8 },
    spaceHeaderCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8 },
    spaceHeaderEmoji: { fontSize: 16 },
    spaceHeaderName: { color: C.text, fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
    spaceContextBar: {
      paddingHorizontal: 14, paddingVertical: 8,
      backgroundColor: C.surface2, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    spaceContextText: { color: C.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
    searchRow: {
      flexDirection: "row", alignItems: "center", margin: 12,
      backgroundColor: C.surface2, borderRadius: 10, borderWidth: 1,
      borderColor: C.border, paddingHorizontal: 10,
    },
    searchIcon: { marginRight: 6 },
    searchInput: {
      flex: 1, color: C.text, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 8,
    },
    listContent: { paddingBottom: 20 },
    crossThreadContainer: { flex: 1, paddingHorizontal: 12 },
    crossThreadLoading: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 20 },
    crossThreadLoadingText: { color: C.textTertiary, fontSize: 13, fontFamily: "Inter_400Regular" },
    crossThreadEmpty: { paddingVertical: 24, alignItems: "center" },
    crossThreadEmptyText: { color: C.textTertiary, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
    crossThreadHeader: {
      color: C.textTertiary, fontSize: 11, fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.6, marginBottom: 8, marginTop: 4,
    },
    crossThreadResult: {
      backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border,
      padding: 12, marginBottom: 8,
    },
    crossThreadResultHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    crossThreadConvTitle: { color: C.primary, fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
    crossThreadSnippet: { color: C.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
    companionsRow: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      marginHorizontal: 12, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: C.surface2, borderRadius: 10, borderWidth: 1, borderColor: C.border,
    },
    companionsLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    companionsText: { color: C.textSecondary, fontSize: 13, fontFamily: "Inter_400Regular" },
    companionsTextActive: { color: C.primary, fontFamily: "Inter_500Medium" },
    spacesSection: { marginHorizontal: 12, marginBottom: 4 },
    spacesSectionHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      marginBottom: 6, paddingHorizontal: 2,
    },
    spacesSectionTitle: {
      color: C.textTertiary, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8,
    },
    spacesAddBtn: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
      alignItems: "center", justifyContent: "center",
    },
    spacesEmpty: { paddingVertical: 8, paddingHorizontal: 10 },
    spacesEmptyText: { color: C.textTertiary, fontSize: 12, fontFamily: "Inter_400Regular" },
    spacesList: { gap: 2 },
    spaceItem: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    },
    spaceItemActive: { backgroundColor: C.surface2 },
    spaceItemEmoji: { fontSize: 15 },
    spaceItemName: { flex: 1, color: C.textSecondary, fontSize: 13, fontFamily: "Inter_400Regular" },
    spaceItemNameActive: { color: C.primary, fontFamily: "Inter_500Medium" },
    empty: { alignItems: "center", marginTop: 40 },
    emptyText: { color: C.textTertiary, fontSize: 14, fontFamily: "Inter_400Regular" },
    modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)" },
    renameModal: {
      position: "absolute", left: 24, right: 24, top: "40%",
      backgroundColor: C.surface2, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border,
    },
    renameTitle: { color: C.text, fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 16 },
    renameInput: {
      backgroundColor: C.surface3, borderRadius: 10, borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 14, paddingVertical: 10, color: C.text,
      fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 16,
    },
    renameActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
    cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: C.surface3 },
    cancelText: { color: C.textSecondary, fontSize: 14, fontFamily: "Inter_500Medium" },
    saveBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: C.primary },
    saveText: { color: "#fff", fontSize: 14, fontFamily: "Inter_500Medium" },
  });
}
