import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "dark" | "light" | "system";

export type ToneMode = "formal" | "casual" | "friendly";
export type VerbosityMode = "concise" | "balanced" | "detailed";
export type ExpertiseLevel = "beginner" | "intermediate" | "expert";

export interface AppSettings {
  theme: ThemeMode;
  language: string;
  redactionEnabled: boolean;
  tone: ToneMode;
  verbosity: VerbosityMode;
  expertiseLevel: ExpertiseLevel;
}

const defaultAppSettings: AppSettings = {
  theme: "dark",
  language: "English",
  redactionEnabled: true,
  tone: "casual",
  verbosity: "balanced",
  expertiseLevel: "intermediate",
};

const APP_SETTINGS_KEY = "app_settings";

interface SettingsContextType {
  appSettings: AppSettings;
  updateAppSettings: (s: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [appSettings, setAppSettings] =
    useState<AppSettings>(defaultAppSettings);

  useEffect(() => {
    AsyncStorage.getItem(APP_SETTINGS_KEY).then((raw) => {
      if (raw) setAppSettings({ ...defaultAppSettings, ...JSON.parse(raw) });
    });
  }, []);

  async function updateAppSettings(s: Partial<AppSettings>) {
    const updated = { ...appSettings, ...s };
    setAppSettings(updated);
    await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(updated));
  }

  return (
    <SettingsContext.Provider value={{ appSettings, updateAppSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettingsContext must be used within SettingsProvider");
  return ctx;
}
