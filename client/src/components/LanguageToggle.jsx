import { useEffect, useRef, useState } from "react";
import { Check, Languages } from "lucide-react";

import { LANGUAGES } from "../i18n/translations";
import { useLanguage } from "../context/LanguageContext";

/** Button with a small menu to choose the site language (English, Hindi, Odia). */
const LanguageToggle = () => {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  // close on outside click or Escape
  useEffect(() => {
    if (!open) return undefined;

    const onDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => event.key === "Escape" && setOpen(false);

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (code) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <div className="lang-menu" ref={wrapRef}>
      <button
        type="button"
        className="lang-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("lang.switch")}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("lang.switch")}
      >
        <Languages size={16} />
        <span>{current.label}</span>
      </button>

      {open && (
        <ul className="lang-list" role="menu">
          {LANGUAGES.map((l) => (
            <li key={l.code} role="none">
              <button type="button" role="menuitemradio" aria-checked={l.code === lang} lang={l.code} onClick={() => choose(l.code)}>
                {l.name}
                {l.code === lang && <Check size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageToggle;
