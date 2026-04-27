import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import { SUPPORTED_LANGUAGES, type Language } from "@/shared/config/constants";

const deviceLang = Localization.getLocales()[0]?.languageCode;
const initial: Language =
  deviceLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(deviceLang)
    ? (deviceLang as Language)
    : "en";

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: initial,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

export default i18n;
