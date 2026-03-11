import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Space {
  id: string;
  name: string;
  emoji: string;
  context: string;
  instructions: string;
  defaultModel: string;
  createdAt: number;
}

interface SpacesContextType {
  spaces: Space[];
  activeSpaceId: string | null;
  setActiveSpace: (id: string | null) => void;
  createSpace: (space: Omit<Space, "id" | "createdAt">) => Promise<Space>;
  updateSpace: (id: string, updates: Partial<Space>) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  getActiveSpace: () => Space | null;
}

const SpacesContext = createContext<SpacesContextType | null>(null);
const SPACES_KEY = "ai_spaces";
const ACTIVE_SPACE_KEY = "ai_active_space";

export function SpacesProvider({ children }: { children: React.ReactNode }) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceIdState] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SPACES_KEY),
      AsyncStorage.getItem(ACTIVE_SPACE_KEY),
    ]).then(([spacesRaw, activeRaw]) => {
      if (spacesRaw) setSpaces(JSON.parse(spacesRaw));
      if (activeRaw) setActiveSpaceIdState(activeRaw);
    });
  }, []);

  async function saveSpaces(updated: Space[]) {
    setSpaces(updated);
    await AsyncStorage.setItem(SPACES_KEY, JSON.stringify(updated));
  }

  async function setActiveSpace(id: string | null) {
    setActiveSpaceIdState(id);
    if (id) {
      await AsyncStorage.setItem(ACTIVE_SPACE_KEY, id);
    } else {
      await AsyncStorage.removeItem(ACTIVE_SPACE_KEY);
    }
  }

  async function createSpace(spaceData: Omit<Space, "id" | "createdAt">): Promise<Space> {
    const space: Space = {
      ...spaceData,
      id: `space-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
    };
    await saveSpaces([space, ...spaces]);
    return space;
  }

  async function updateSpace(id: string, updates: Partial<Space>) {
    await saveSpaces(spaces.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  async function deleteSpace(id: string) {
    await saveSpaces(spaces.filter((s) => s.id !== id));
    if (activeSpaceId === id) await setActiveSpace(null);
  }

  function getActiveSpace(): Space | null {
    return spaces.find((s) => s.id === activeSpaceId) ?? null;
  }

  return (
    <SpacesContext.Provider value={{
      spaces, activeSpaceId, setActiveSpace, createSpace, updateSpace, deleteSpace, getActiveSpace,
    }}>
      {children}
    </SpacesContext.Provider>
  );
}

export function useSpaces(): SpacesContextType {
  const ctx = useContext(SpacesContext);
  if (!ctx) throw new Error("useSpaces must be used within SpacesProvider");
  return ctx;
}
