import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { LANGUAGES, translate } from "../i18n/translations";
import { ensureLanguage, getActiveLanguage, isLanguageLoaded, setActiveLanguage } from "../i18n/runtime";

const STORAGE_KEY = "voyara_lang";

const LanguageContext = createContext(null);

const supported = LANGUAGES.map((l) => l.code);

export const LanguageProvider = ({ children }) => {
  // runtime.js already read the saved choice when the page loaded
  const [lang, setLangState] = useState(getActiveLanguage);

  // bumps when the texts of a language finish downloading, so everything shown is redrawn
  const [version, setVersion] = useState(0);

  // keep tg() (used outside components) on the same language, before any child renders
  setActiveLanguage(lang);

  // a saved language whose texts are not downloaded yet (a page load with Odia saved)
  useEffect(() => {
    if (isLanguageLoaded(lang)) return undefined;

    let alive = true;

    ensureLanguage(lang).then(() => alive && setVersion((v) => v + 1));

    return () => {
      alive = false;
    };
  }, [lang]);

  // switching language: download first, then switch, so the page never flashes half English
  const setLang = useCallback((code) => {
    if (!supported.includes(code)) return;

    ensureLanguage(code).then(() => {
      setLangState(code);
      setVersion((v) => v + 1);
    });
  }, []);

  // screen readers and browsers need to know the page language
  useEffect(() => {
    document.documentElement.lang = lang;

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // storage blocked: the choice just lasts until the page is closed
    }
  }, [lang]);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleLanguage = useCallback(() => setLang(supported[(supported.indexOf(lang) + 1) % supported.length]), [lang, setLang]);

  const value = useMemo(
    () => ({ lang, setLang, t, toggleLanguage, isHindi: lang === "hi", isOdia: lang === "or" }),
    [lang, setLang, t, toggleLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) throw new Error("useLanguage must be used inside a LanguageProvider");

  return context;
};
