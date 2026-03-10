import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConversationItem } from "@/components/ConversationItem";
import { Conversation, useChatContext } from "@/contexts/ChatContext";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

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
  const { conversations, deleteConversation, renameConversation } =
    useChatContext();
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const insets = useSafeAreaInsets();

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
    setRenam