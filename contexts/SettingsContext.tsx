import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "dark" | "light" | "system";
export type ToneMode = "formal" | "casual" | "friendly";
export type VerbosityMode = "concise" | "balanced" | "detailed";
export type ExpertiseLevel = "beginner" | "intermediate" | "expert";

export interface LearnedStyle {
  prefersBullets: boolean;
  prefersExamples: boolean;
  prefersConcise: boolean;
  domains: string[];
  updatedAt: number;
}

export interface DefaultModels {
  chat: string;
  code: string;
  research: string;
  writing: string;
}

export interface AppSettings {
  theme: ThemeMode;
  language: string;
  redactionEnabled: boolean;
  tone: ToneMode;
  verbosity: VerbosityMode;
  expertiseLevel: ExpertiseLevel;
  learnedStyle: LearnedStyle;
  defaultModels: DefaultModels;
}

const defaultLearnedStyle: LearnedStyle = {
  prefersBullets: false,
  prefersExamples: false,
  prefersConcise: false,
  domains: [],
  updatedAt: 0,
};

const defaultDefaultModels: DefaultModels = {
  chat: "llama-3.3-70b-versatile",
  code: "deepseek/deepseek-chat",
  research: "compound-beta",
  writing: "anthropic/claude-3.5-sonnet",
};

const defaultAppSettings: AppSettings = {
  theme: "dark",
  language: "English",
  redactionEnabled: true,
  tone: "casual",
  verbosity: "balanced",
  expertiseLevel: "intermediate",
  learnedStyle: defaultLearnedStyle,
  defaultModels: defaultDefaultModels,
};

const APP_SETTINGS_KEY = "app_settings";

interface SettingsContextType {
  appSettings: AppSettings;
  updateAppSettings: (s: Partial<AppSettings>) => Promise<void>;
  updateLearnedStyle: (updates: Partial<LearnedStyle>) => Promise<void>;
  resetLearnedStyle: () => Promise<void>;
  updateDefaultModels: (updates: Partial<DefaultModels>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);

  useEffect(() => {
    AsyncStorage.getItem(APP_SETTINGS_KEY).then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        setAppSettings({
          ...defaultAppSettings,
          ...parsed,
          learnedStyle: { ...defaultLearnedStyle, ...(parsed.learnedStyle || {}) },
          defaultModels: { ...defaultDefaultModels, ...(parsed.defaultModels || {}) },
        });
      }
    });
  }, []);

  async function updateAppSettings(s: Partial<AppSettings>) {
    const updated = { ...appSettings, ...s };
    setAppSettings(updated);
    await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(updated));
  }

  async function updateLearnedStyle(updates: Partial<LearnedStyle>) {
    const updated = {
      ...appSettings,
      learnedStyle: { ...appSettings.learnedStyle, ...updates, updatedAt: Date.now() },
    };
    setAppSettings(updated);
    await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(updated));
  }

  async function resetLearnedStyle() {
    await updateLearnedStyle({ ...defaultLearnedStyle, updatedAt: 0 });
  }

  async function updateDefaultModels(updates: Partial<DefaultModels>) {
    const updated = {
      ...appSettings,
      defaultModels: { ...appSettings.defaultModels, ...updates },
    };
    setAppSettings(updated);
    await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(updated));
  }

  return (
    <SettingsContext.Provider value={{ appSettings, updateAppSettings, updateLearnedStyle, resetLearnedStyle, updateDefaultModels }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettingsContext must be used within SettingsProvider");
  return ctx;
}
