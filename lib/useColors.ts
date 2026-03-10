import { useColorScheme } from "react-native";
import { darkColors, lightColors, ColorTheme } from "@/constants/colors";
import { useSettingsContext } from "@/contexts/SettingsContext";

export function useColors(): ColorTheme {
  const { appSettings } = useSettingsContext();
  const systemScheme = useColorScheme();

  if (appSettings.theme === "system") {
    return systemScheme === "light" ? lightColors : darkColors;
  }
  return appSettings.theme === "light" ? lightColors : darkColors;
}
