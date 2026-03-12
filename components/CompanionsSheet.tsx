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
  CompanionTone,
  CompanionVerbosity,
  BUILT_IN_COMPANIONS,
} from "@/contexts/CompanionsContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const AVAILABLE_MODELS = [
  { id: "deepseek/deepseek-chat", label: "DeepSeek V3" },
  { id: "qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5" },
  { id: "mistralai/mistral-small-3.1-24b-instruct", label: "Mistral 24B" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5" },
  { id: "google/gemini-pro-1.5", label: "Gemini Pro" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "llama-3.3-70b-versatile", label: "LLaMA 70B" },
];

const MODEL_SHORT: Record<string, string> = {
  "gpt-4o": "GPT-4o",
  "anthropic/claude-3.5-sonnet": "Claude",
  "deepseek/deepseek-chat": "DeepSeek",
  "qwen/qwen-2.5-72b-instruct": "Qwen 2.5",
  "mistralai/mistral-small-3.1-24b-instruct": "Mistral",
  "google/gemini-pro-1.5": "Gemini",
  "llama-3.3-70b-versatile": "LLaMA",
};

const AVAILABLE_TOOLS = [
  { id: "search", label: "Web Search", icon: "globe", color: "#3B82F6" },
  { id: "research", label: "Deep Research", icon: "layers", color: "#8B5CF6" },
  { id: "code", label: "Code Mode", icon: "terminal", color: "#10B981" },
  { id: "memory", label: "Memory", icon: "bookmark", color: "#F59E0B" },
];

const ICON_OPTIONS = ["user", "star", "heart", "cpu", "edit-3", "briefcase", "code", "book", "music", "globe", "shield", "trending-up"];
const COLOR_OPTIONS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#6366F1", "#059669", "#F97316", "#EC4899", "#14B8A6"];

const TONE_OPTIONS: { value: CompanionTone; label: string }[] = [
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "friendly", label: "Friendly" },
];

const VERBOSITY_OPTIONS: { value: CompanionVerbosity; label: string }[] = [
  { value: "concise", label: "Concise" },
  { value: "balanced", label: "Balanced" },
  { value: "detailed", label: "Detailed" },
];

export function CompanionsSheet({ visible, onClose }: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { companions, activeCompanionId, setActiveCompanion, createCustomCompanion, deleteCustomCompanion } = useCompanions();
  const styles = useMemo(() => createStyles(C), [C]);

  const [showBuilder, setShowBuilder] = useState(false);
  const [buildName, setBuildName] = useState("");
  const [buildDesc, setBuildDesc] = useState("");
  const [buildPrompt, setBuildPrompt] = useState("");
  const [buildIcon, setBuildIcon] = useState("user");
  const [buildColor, setBuildColor] = useState("#8B5CF6");
  const [buildTools, setBuildTools] = useState<string[]>([]);
  const [buildModel, setBuildModel] = useState<string>("");
  const [buildTone, setBuildTone] = useState<CompanionTone>("casual");
  const [buildVerbosity, setBuildVerbosity] = useState<CompanionVerbosity>("balanced");
  const [buildError, setBuildError] = useState("");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const customCompanions = companions.filter((c) => c.isCustom);

  const handleSelect = (id: string) => {
    setActiveCompanion(activeCompanionId === id ? null : id);
    onClose();
  };

  const toggleTool = (toolId: string) => {
    setBuildTools((prev) =>
      prev.includes(toolId) ? prev.filter((t) => t !== toolId) : [...prev, toolId]
    );
  };

  const resetBuilder = () => {
    setBuildName(""); setBuildDesc(""); setBuildPrompt(""); setBuildError("");
    setBuildIcon("user"); setBuildColor("#8B5CF6"); setBuildTools([]);
    setBuildModel(""); setBuildTone("casual"); setBuildVerbosity("balanced");
  };

  const handleCreate = async () => {
    if (!buildName.trim()) { setBuildError("Name is required"); return; }
    if (!buildPrompt.trim()) { setBuildError("System prompt is required"); return; }
    await createCustomCompanion({
      name: buildName.trim(),
      description: buildDesc.trim() || "Custom companion",
      icon: buildIcon,
      color: buildColor,
      systemPrompt: buildPrompt.trim(),
      tools: buildTools.length > 0 ? buildTools : undefined,
      defaultModel: buildModel || undefined,
      tone: buildTone,
      verbosity: buildVerbosity,
    });
    resetBuilder();
    setShowBuilder(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
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
                key={c.id} companion={c}
                isActive={activeCompanionId === c.id}
                onPress={() => handleSelect(c.id)}
                styles={styles} C={C}
              />
            ))}
          </View>

          {customCompanions.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>CUSTOM</Text>
              <View style={styles.grid}>
                {customCompanions.map((c) => (
                  <CompanionCard
                    key={c.id} companion={c}
                    isActive={activeCompanionId === c.id}
                    onPress={() => handleSelect(c.id)}
                    onDelete={() => deleteCustomCompanion(c.id)}
                    styles={styles} C={C}
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
          onRequestClose={() => { resetBuilder(); setShowBuilder(false); }}
        >
          <View style={[styles.container, { paddingTop: topPadding }]}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Create Companion</Text>
              <Pressable style={styles.closeBtn} onPress={() => { resetBuilder(); setShowBuilder(false); }}>
                <Feather name="x" size={20} color={C.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              {buildError ? <Text style={styles.errorText}>{buildError}</Text> : null}

              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput
                style={styles.fieldInput}
                value={buildName} onChangeText={setBuildName}
                placeholder="e.g. My Legal Assistant"
                placeholderTextColor={C.textTertiary} selectionColor={C.primary}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.fieldInput}
                value={buildDesc} onChangeText={setBuildDesc}
                placeholder="One-line description"
                placeholderTextColor={C.textTertiary} selectionColor={C.primary}
              />

              <Text style={styles.fieldLabel}>Icon</Text>
              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map((icon) => (
                  <Pressable
                    key={icon}
                    style={[styles.iconOption, buildIcon === icon && { backgroundColor: buildColor + "33", borderColor: buildColor }]}
                    onPress={() => setBuildIcon(icon)}
                  >
                    <Feather name={icon as any} size={18} color={buildIcon === icon ? buildColor : C.textSecondary} />
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Color</Text>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((color) => (
                  <Pressable
                    key={color}
                    style={[styles.colorDot, { backgroundColor: color }, buildColor === color && styles.colorDotActive]}
                    onPress={() => setBuildColor(color)}
                  />
                ))}
              </View>

              <Text style={styles.fieldLabel}>System Prompt *</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldTextarea]}
                value={buildPrompt} onChangeText={setBuildPrompt}
                placeholder="Describe how the AI should behave..."
                placeholderTextColor={C.textTertiary} selectionColor={C.primary}
                multiline numberOfLines={6} textAlignVertical="top"
              />

              <Text style={styles.fieldLabel}>Response Tone</Text>
              <Text style={styles.fieldHint}>How this companion communicates with you</Text>
              <View style={styles.toneRow}>
                {TONE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.toneChip, buildTone === opt.value && { backgroundColor: buildColor + "22", borderColor: buildColor }]}
                    onPress={() => setBuildTone(opt.value)}
                  >
                    <Text style={[styles.toneChipText, buildTone === opt.value && { color: buildColor }]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Response Style</Text>
              <Text style={styles.fieldHint}>How detailed should responses be</Text>
              <View style={styles.toneRow}>
                {VERBOSITY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.toneChip, buildVerbosity === opt.value && { backgroundColor: buildColor + "22", borderColor: buildColor }]}
                    onPress={() => setBuildVerbosity(opt.value)}
                  >
                    <Text style={[styles.toneChipText, buildVerbosity === opt.value && { color: buildColor }]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Default Model (optional)</Text>
              <Text style={styles.fieldHint}>This model will be used whenever this companion is active</Text>
              <View style={styles.modelGrid}>
                <Pressable
                  style={[styles.modelChip, buildModel === "" && styles.modelChipActive]}
                  onPress={() => setBuildModel("")}
                >
                  <Text style={[styles.modelChipText, buildModel === "" && styles.modelChipTextActive]}>Auto</Text>
                </Pressable>
                {AVAILABLE_MODELS.map((m) => (
                  <Pressable
                    key={m.id}
                    style={[styles.modelChip, buildModel === m.id && styles.modelChipActive]}
                    onPress={() => setBuildModel(m.id)}
                  >
                    <Text style={[styles.modelChipText, buildModel === m.id && styles.modelChipTextActive]}>{m.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Tools</Text>
              <Text style={styles.fieldHint}>These tools will be pre-activated for this companion</Text>
              <View style={styles.toolsGrid}>
                {AVAILABLE_TOOLS.map((tool) => {
                  const active = buildTools.includes(tool.id);
                  return (
                    <Pressable
                      key={tool.id}
                      style={[styles.toolChip, active && { backgroundColor: tool.color + "22", borderColor: tool.color + "55" }]}
                      onPress={() => toggleTool(tool.id)}
                    >
                      <Feather name={tool.icon as any} size={13} color={active ? tool.color : C.textSecondary} />
                      <Text style={[styles.toolChipText, active && { color: tool.color }]}>{tool.label}</Text>
                      {active && <Feather name="check" size={11} color={tool.color} />}
                    </Pressable>
                  );
                })}
              </View>

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
  companion, isActive, onPress, onDelete, styles, C,
}: {
  companion: Companion; isActive: boolean; onPress: () => void;
  onDelete?: () => void; styles: ReturnType<typeof createStyles>; C: ReturnType<typeof useColors>;
}) {
  const modelLabel = companion.defaultModel ? MODEL_SHORT[companion.defaultModel] ?? null : null;
  const toneLabel = companion.tone ? companion.tone.charAt(0).toUpperCase() + companion.tone.slice(1) : null;
  return (
    <Pressable style={[styles.card, isActive && styles.cardActive]} onPress={onPress}>
      <View style={[styles.cardIcon, { backgroundColor: companion.color + "22" }]}>
        <Feather name={companion.icon as any} size={20} color={companion.color} />
      </View>
      <Text style={styles.cardName} numberOfLines={1}>{companion.name}</Text>
      <Text style={styles.cardDesc} numberOfLines={2}>{companion.description}</Text>
      <View style={styles.cardFooter}>
        {companion.tools && companion.tools.length > 0 && (
          <View style={styles.cardTools}>
            {companion.tools.slice(0, 3).map((t) => (
              <View key={t} style={[styles.cardToolDot, { backgroundColor: companion.color + "33" }]}>
                <Feather
                  name={t === "search" ? "globe" : t === "research" ? "layers" : t === "code" ? "terminal" : "bookmark"}
                  size={9} color={companion.color}
                />
              </View>
            ))}
          </View>
        )}
        <View style={styles.cardBadges}>
          {toneLabel && (
            <View style={[styles.toneBadge, { backgroundColor: companion.color + "18" }]}>
              <Text style={[styles.toneBadgeText, { color: companion.color }]}>{toneLabel}</Text>
            </View>
          )}
          {modelLabel && (
            <View style={[styles.modelBadge, { backgroundColor: companion.color + "18" }]}>
              <Text style={[styles.modelBadgeText, { color: companion.color }]}>{modelLabel}</Text>
            </View>
          )}
        </View>
      </View>
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
    container: { flex: 1, backgroundColor: C.background },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerTitle: { color: C.text, fontSize: 18, fontFamily: "Inter_600SemiBold" },
    closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: C.surface2 },
    scroll: { flex: 1 },
    clearRow: {
      flexDirection: "row", alignItems: "center", gap: 8,
      marginHorizontal: 20, marginTop: 16, marginBottom: 4,
      paddingVertical: 10, paddingHorizontal: 14,
      backgroundColor: C.surface2, borderRadius: 10, borderWidth: 1, borderColor: C.border,
    },
    clearText: { color: C.textSecondary, fontSize: 13, fontFamily: "Inter_400Regular" },
    sectionLabel: {
      color: C.textTertiary, fontSize: 11, fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.8, marginLeft: 20, marginTop: 20, marginBottom: 10,
    },
    grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 14, gap: 10 },
    card: {
      width: "46%", backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.border, padding: 14, gap: 6, position: "relative",
    },
    cardActive: { borderColor: C.primary, backgroundColor: C.surface2 },
    cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 2 },
    cardName: { color: C.text, fontSize: 14, fontFamily: "Inter_600SemiBold" },
    cardDesc: { color: C.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
    cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, flexWrap: "wrap", gap: 4 },
    cardTools: { flexDirection: "row", gap: 4 },
    cardToolDot: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    cardBadges: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
    modelBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    modelBadgeText: { fontSize: 10, fontFamily: "Inter_500Medium" },
    toneBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    toneBadgeText: { fontSize: 10, fontFamily: "Inter_400Regular" },
    activeIndicator: {
      position: "absolute", top: 10, right: 10, width: 20, height: 20,
      borderRadius: 10, backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
    },
    deleteBtn: { position: "absolute", bottom: 10, right: 10 },
    createBtn: {
      flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: 16,
      paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1,
      borderColor: C.border, borderStyle: "dashed",
    },
    createBtnText: { color: C.primary, fontSize: 14, fontFamily: "Inter_500Medium" },
    errorText: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 },
    fieldLabel: { color: C.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 16 },
    fieldHint: { color: C.textTertiary, fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8, marginTop: -4 },
    fieldInput: {
      backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 14, paddingVertical: 10, color: C.text, fontSize: 14, fontFamily: "Inter_400Regular",
    },
    fieldTextarea: { height: 140, paddingTop: 10 },
    iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    iconOption: {
      width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1,
      borderColor: C.border, alignItems: "center", justifyContent: "center",
    },
    colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    colorDot: { width: 28, height: 28, borderRadius: 14 },
    colorDotActive: { borderWidth: 3, borderColor: "#fff" },
    toneRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
    toneChip: {
      flex: 1, paddingVertical: 9, borderRadius: 10,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      alignItems: "center",
    },
    toneChipText: { color: C.textSecondary, fontSize: 13, fontFamily: "Inter_400Regular" },
    modelGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    modelChip: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    },
    modelChipActive: { backgroundColor: C.primary + "22", borderColor: C.primary },
    modelChipText: { color: C.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" },
    modelChipTextActive: { color: C.primary, fontFamily: "Inter_500Medium" },
    toolsGrid: { gap: 8 },
    toolChip: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    },
    toolChipText: { color: C.textSecondary, fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
    saveBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
    saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
}
