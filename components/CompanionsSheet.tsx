import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/lib/useColors";
import {
  useCompanions,
  Companion,
  BUILT_IN_COMPANIONS,
} from "@/contexts/CompanionsContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CompanionsSheet({ visible, onClose }: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { companions, activeCompanionId, setActiveCompanion, createCustomCompanion, deleteCustomCompanion } =
    useCompanions();
  const styles = useMemo(() => createStyles(C), [C]);

  const [showBuilder, setShowBuilder] = useState(false);
  const [buildName, setBuildName] = useState("");
  const [buildDesc, setBuildDesc] = useState("");
  const [buildPrompt, setBuildPrompt] = useState("");
  const [buildError, setBuildError] = useState("");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const customCompanions = companions.filter((c) => c.isCustom);

  const handleSelect = (id: string) => {
    if (activeCompanionId === id) {
      setActiveCompanion(null);
    } else {
      setActiveCompanion(id);
    }
    onClose();
  };

  const handleCreate = async () => {
    if (!buildName.trim()) { setBuildError("Name is required"); return; }
    if (!buildPrompt.trim()) { setBuildError("System prompt is required"); return; }
    await createCustomCompanion({
      name: buildName.trim(),
      description: buildDesc.trim() || "Custom companion",
      icon: "user",
      color: "#8B5CF6",
      systemPrompt: buildPrompt.trim(),
    });
    setBuildName(""); setBuildDesc(""); setBuildPrompt(""); setBuildError("");
    setShowBuilder(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Companions</Text>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {activeCompanionId && (
            <Pressable style={styles.clearRow} onPress={() => { setActiveCompanion(null); onClose(); }}>
              <Feather name="x-circle" size={15} color={C.textSecondary} />
              <Text style={styles.clearText}>Clear companion (use default AI)</Text>
            </Pressable>
          )}

          <Text style={styles.sectionLabel}>BUILT-IN</Text>
          <View style={styles.grid}>
            {BUILT_IN_COMPANIONS.map((c) => (
              <CompanionCard
                key={c.id}
                companion={c}
                isActive={activeCompanionId === c.id}
                onPress={() => handleSelect(c.id)}
                styles={styles}
                C={C}
              />
            ))}
          </View>

          {customCompanions.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>CUSTOM</Text>
              <View style={styles.grid}>
                {customCompanions.map((c) => (
                  <CompanionCard
                    key={c.id}
                    companion={c}
                    isActive={activeCompanionId === c.id}
                    onPress={() => handleSelect(c.id)}
                    onDelete={() => deleteCustomCompanion(c.id)}
                    styles={styles}
                    C={C}
                  />
                ))}
              </View>
            </>
          )}

          <Pressable style={styles.createBtn} onPress={() => setShowBuilder(true)}>
            <Feather name="plus" size={16} color={C.primary} />
            <Text style={styles.createBtnText}>Create custom companion</Text>
          </Pressable>

          <View style={{ height: insets.bottom + 32 }} />
        </ScrollView>

        <Modal
          visible={showBuilder}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowBuilder(false)}
        >
          <View style={[styles.container, { paddingTop: topPadding }]}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Create Companion</Text>
              <Pressable style={styles.closeBtn} onPress={() => setShowBuilder(false)}>
                <Feather name="x" size={20} color={C.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }}>
              {buildError ? (
                <Text style={styles.errorText}>{buildError}</Text>
              ) : null}
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput
                style={styles.fieldInput}
                value={buildName}
                onChangeText={setBuildName}
                placeholder="e.g. My Legal Assistant"
                placeholderTextColor={C.textTertiary}
                selectionColor={C.primary}
              />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.fieldInput}
                value={buildDesc}
                onChangeText={setBuildDesc}
                placeholder="One-line description"
                placeholderTextColor={C.textTertiary}
                selectionColor={C.primary}
              />
              <Text style={styles.fieldLabel}>System Prompt *</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldTextarea]}
                value={buildPrompt}
                onChangeText={setBuildPrompt}
                placeholder="Describe how the AI should behave..."
                placeholderTextColor={C.textTertiary}
                selectionColor={C.primary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Pressable style={styles.saveBtn} onPress={handleCreate}>
                <Text style={styles.saveBtnText}>Create Companion</Text>
              </Pressable>
              <View style={{ height: insets.bottom + 24 }} />
            </ScrollView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

function CompanionCard({
  companion,
  isActive,
  onPress,
  onDelete,
  styles,
  C,
}: {
  companion: Companion;
  isActive: boolean;
  onPress: () => void;
  onDelete?: () => void;
  styles: ReturnType<typeof createStyles>;
  C: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      style={[styles.card, isActive && styles.cardActive]}
      onPress={onPress}
    >
      <View style={[styles.cardIcon, { backgroundColor: companion.color + "22" }]}>
        <Feather name={companion.icon as any} size={20} color={companion.color} />
      </View>
      <Text style={styles.cardName} numberOfLines={1}>{companion.name}</Text>
      <Text style={styles.cardDesc} numberOfLines={2}>{companion.description}</Text>
      {isActive && (
        <View style={styles.activeIndicator}>
          <Feather name="check" size={11} color="#fff" />
        </View>
      )}
      {onDelete && (
        <Pressable style={styles.deleteBtn} onPress={onDelete} hitSlop={8}>
          <Feather name="trash-2" size={12} color={C.textTertiary} />
        </Pressable>
      )}
    </Pressable>
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
    clearRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 4,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: C.surface2,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
    },
    clearText: {
      color: C.textSecondary,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
    },
    sectionLabel: {
      color: C.textTertiary,
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.8,
      marginLeft: 20,
      marginTop: 20,
      marginBottom: 10,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 14,
      gap: 10,
    },
    card: {
      width: "46%",
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
      gap: 6,
      position: "relative",
    },
    cardActive: {
      borderColor: C.primary,
      backgroundColor: C.surface2,
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 2,
    },
    cardName: {
      color: C.text,
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
    },
    cardDesc: {
      color: C.textSecondary,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      lineHeight: 16,
    },
    activeIndicator: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteBtn: {
      position: "absolute",
      bottom: 10,
      right: 10,
    },
    createBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 20,
      marginTop: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      borderStyle: "dashed",
    },
    createBtnText: {
      color: C.primary,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
    },
    errorText: {
      color: "#EF4444",
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      marginBottom: 12,
    },
    fieldLabel: {
      color: C.textSecondary,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      marginBottom: 6,
      marginTop: 16,
    },
    fieldInput: {
      backgroundColor: C.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: C.text,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    fieldTextarea: {
      height: 140,
      paddingTop: 10,
    },
    saveBtn: {
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 24,
    },
    saveBtnText: {
      color: "#fff",
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
  });
}
