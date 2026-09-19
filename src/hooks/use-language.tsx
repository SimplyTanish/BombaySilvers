import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { LANGUAGES, translate as t, type LanguageCode } from "@/lib/i18n";

type LanguageContextValue = {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "bs_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (saved && LANGUAGES.some((l) => l.code === saved)) {
      setLangState(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const setLang = useCallback((next: LanguageCode) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const page = (key: string, fallback?: string) => t(lang, key, fallback);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: page }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}