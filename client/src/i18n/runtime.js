// The language the website is showing right now, readable from ANY code (not only React components).
//
// React components read it with `const { t } = useLanguage()`. Plain functions, class
// components and the API layer use `tg("English text")` from here. LanguageProvider keeps
// this in step with the visitor's choice.

import { LANGUAGES, translate, translations, resetTemplates } from "./translations";

const STORAGE_KEY = "voyara_lang";

const supported = LANGUAGES.map((l) => l.code);

const initial = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    return supported.includes(saved) ? saved : "en";
  } catch {
    return "en";
  }
};

let active = initial();

export const getActiveLanguage = () => active;

export const setActiveLanguage = (code) => {
  if (supported.includes(code)) active = code;
};

// month names follow the language (Odia: ଜାନୁଆରୀ ...). Numbers stay as they are: 12,34,567.
const DATE_LOCALES = { en: "en-IN", hi: "hi-IN", or: "or-IN" };

export const dateLocale = () => DATE_LOCALES[active] || "en-IN";

/** Translates in the language being shown. Unknown text comes back unchanged. */
export const tg = (text, vars) => translate(active, text, vars);

// ---------------------------------------------------------------------------
// Big dictionaries are downloaded only for visitors who pick that language.
// ---------------------------------------------------------------------------

const loaders = {
  hi: () => import("./hi-phrases").then((module) => module.hiPhrases),
  or: () => import("./or-phrases").then((module) => module.orPhrases),
};

const loaded = new Set(LANGUAGES.map((l) => l.code).filter((code) => !loaders[code]));
const pending = {};

export const isLanguageLoaded = (code) => loaded.has(code);

/** Resolves when the texts of `code` are ready. Safe to call many times. */
export const ensureLanguage = (code) => {
  if (loaded.has(code)) return Promise.resolve();

  if (!pending[code]) {
    pending[code] = loaders[code]()
      .then((phrases) => {
        Object.assign(translations[code], phrases);
        resetTemplates(code);
        loaded.add(code);
      })
      .catch((error) => {
        // offline or a failed download: the site stays in English rather than breaking
        console.error("Could not load the language:", error.message);
        delete pending[code];
      });
  }

  return pending[code];
};
