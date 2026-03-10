export const darkColors = {
  background: "#0A0A0A",
  surface: "#141414",
  surface2: "#1C1C1C",
  surface3: "#242424",
  border: "#2A2A2A",
  borderLight: "#333333",
  text: "#F0F0F0",
  textSecondary: "#8A8A8A",
  textTertiary: "#555555",
  primary: "#7C6EFA",
  primaryDark: "#5A4ECC",
  primaryLight: "#9B8FFB",
  userBubble: "#1A1A2E",
  userBubbleBorder: "#2D2D4E",
  assistantBubble: "transparent",
  error: "#FF4444",
  success: "#4CAF50",
  tint: "#7C6EFA",
  tabIconDefault: "#555555",
  tabIconSelected: "#7C6EFA",
};

export const lightColors = {
  background: "#FFFFFF",
  surface: "#F5F5F5",
  surface2: "#EBEBEB",
  surface3: "#E0E0E0",
  border: "#D5D5D5",
  borderLight: "#C8C8C8",
  text: "#111111",
  textSecondary: "#555555",
  textTertiary: "#999999",
  primary: "#7C6EFA",
  primaryDark: "#5A4ECC",
  primaryLight: "#9B8FFB",
  userBubble: "#EBE9FF",
  userBubbleBorder: "#D5D0FF",
  assistantBubble: "transparent",
  error: "#FF4444",
  success: "#4CAF50",
  tint: "#7C6EFA",
  tabIconDefault: "#999999",
  tabIconSelected: "#7C6EFA",
};

export type ColorTheme = typeof darkColors;

const Colors = darkColors;
export default Colors;
