"use client";

import { createContext, useState, useContext, ReactNode } from "react";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";

type Language = "en" | "hi";
type Translation = typeof en; 
type TranslationKey = keyof Translation;

type LanguageContextType = {
  language: Language;
  t: (key: TranslationKey) => string;
  toggleLanguage: () => void;
};

const translations: Record<Language, Translation> = { en, hi };

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  t: (key: TranslationKey) => key,
  toggleLanguage: () => {}
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");

  const toggleLanguage = () => {
    setLanguage(prev => (prev === "en" ? "hi" : "en"));
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
