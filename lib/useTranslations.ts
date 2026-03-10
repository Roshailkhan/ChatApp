import { useSettingsContext } from "@/contexts/SettingsContext";
import { getTranslations, Translations } from "@/lib/translations";

export function useTranslations(): Translations {
  const { appSettings } = useSettingsContext();
  return getTranslations(appSettings.language);
}
