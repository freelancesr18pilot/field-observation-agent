import { createContext, useContext, useState } from "react";
import { strings } from "./translations.js";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}

/** Returns a lookup function: t("key") → translated string */
export function useT() {
  const { lang } = useLang();
  return (key) => strings[lang]?.[key] ?? strings.en[key] ?? key;
}
