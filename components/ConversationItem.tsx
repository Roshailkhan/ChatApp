import React, { useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Conversation } from "@/contexts/ChatContext";
import { useColors } from "@/lib/useColors";
import { useTranslations } from "@/lib/useTranslations";
import * as Haptics from "expo-haptics";
import { PanResponder } from "react-native";

interface Props {
  conversation: Conversation;
  isActive?: boolean;
  onPress: () => void;
  onDelete: () => void;
  onRename: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onPress,
  onDelete,
  onRename,
}: Props) {
  const C = useColors();
  const t = useTranslations();
  const styles = useMemo(() => createStyles(C), [C]);
  const swipeX = useRef(new Animated.Value(0)).current;
  const ACTION_WIDTH = 80;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        swipeX.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        const newVal = Math.min(0, Math.max(-ACTION_WIDTH * 2, g.dx));
        swipeX.setValue(newVal);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -ACTION_WIDTH) {
          Animated.spring(swipeX, {
            toValue: -ACTION_WIDTH * 2,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(swipeX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const closeSwipe = () => {
    Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
  };

  const handleDelete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t.deleteChat, t.deleteConfirm, [
      { text: t.cancel, onPress: closeSwipe },
      { text: t.delete, style: "destructive", onPress: onDelete },
    ]);
  };

  const handleRename = () => {
    closeSwipe();
    onRename();
  };

  const actionsOpacity = swipeX.interpolate({
    inputRange: [-ACTION_WIDTH * 2, -ACTION_WIDTH, 0],
    outputRange: [1, 0.7, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.outerContainer}>
      <Animated.View style={[styles.actions, { opacity: actionsOpacity }]}>
        <Pressable
          style={[styles.actionBtn, styles.renameBtn]}
          onPress={handleRename}
        >
          <Feather name="edit-2" size={14} color="#fff" />
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={handleDelete}
        >
          <Feather name="trash-2" size={14} color="#fff" />
        </Pressable>
      </Animated.View>

      <Animated.View
        style={{ transform: [{ translateX: swipeX }] }}
        {...panResponder.panHandlers}
      >
        <Pressable
          style={[styles.container, isActive && styles.active]}
          onPress={() => {
            closeSwipe();
            onPress();
          }}
          onLongPress={handleDelete}
          delayLongPress={400}
        >
          <Feather
            name="message-square"
            size={15}
            color={isActive ? C.primary : C.textTertiary}
            style={styles.icon}
          />
          <Text
            style={[styles.title, isActive && styles.activeTitle]}
            numberOfLines={1}
          >
            {conversation.title}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function createStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    outerContainer: {
      position: "relative",
      overflow: "hidden",
    },
    actions: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
    },
    actionBtn: {
      width: 56,
      height: "100%" as any,
      alignItems: "center",
      justifyContent: "center",
    },
    renameBtn: {
      backgroundColor: C.primary,
    },
    deleteBtn: {
      backgroundColor: C.error,
    },
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
      backgroundColor: C.background,
      borderRadius: 8,
      marginHorizontal: 8,
      marginVertical: 1,
    },
    active: {
      backgroundColor: C.surface2,
    },
    icon: {
      flexShrink: 0,
    },
    title: {
      flex: 1,
      color: C.textSecondary,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    activeTitle: {
      color: C.text,
      fontFamily: "Inter_500Medium",
    },
  });
}
