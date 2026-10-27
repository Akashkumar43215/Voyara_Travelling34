import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bot, Maximize2, Minimize2, Sparkles, X, ArrowRight } from "lucide-react";
import { askAssistant } from "../services/api";
import { useLanguage } from "../context/LanguageContext";

const STORAGE_KEY = "voyara_assistant_chat";
const MAX_SAVED = 30;

// the greeting text is looked up when shown, so it follows the chosen language
const WELCOME = {
  from: "bot",
  welcome: true,
  suggestions: ["Plan a 3 day trip to Goa", "Beach trip under 20000", "What is the cancellation policy?", "Show my bookings"],
};

const loadChat = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (error) {
    // storage can be blocked: start fresh
  }

  return [WELCOME];
};

// Our own little robot that floats above the panel
const Mascot = () => (
  <svg className="assistant-mascot" viewBox="0 0 96 96" aria-hidden="true">
    <ellipse cx="48" cy="90" rx="22" ry="4" fill="#000" opacity="0.12" />
    <circle cx="14" cy="38" r="7" fill="#1e6df0" />
    <circle cx="82" cy="38" r="7" fill="#1e6df0" />
    <rect x="16" y="14" width="64" height="48" rx="22" fill="#fff" stroke="#dbe6f7" strokeWidth="2" />
    <rect x="25" y="26" width="46" height="24" rx="12" fill="#0a2a5e" />
    <ellipse cx="38" cy="38" rx="5" ry="6" fill="#53d6ff" />
    <ellipse cx="58" cy="38" rx="5" ry="6" fill="#53d6ff" />
    <ellipse cx="48" cy="72" rx="14" ry="10" fill="#fff" stroke="#dbe6f7" strokeWidth="2" />
  </svg>
);

// "Plan a 3 day trip to Goa" -> first two words are highlighted
const Bubble = ({ text }) => {
  const [a, b, ...rest] = text.split(" ");

  return <><b>{[a, b].filter(Boolean).join(" ")}</b>{rest.length ? ` ${rest.join(" ")}` : ""}</>;
};

/**
 * Floating travel assistant. Answers come from POST /api/assistant, which is rule based
 * and uses VOYARA's own data. Replies are shown as plain text, never as HTML.
 */
const AssistantWidget = () => {
  const { t: tx } = useLanguage();

  const location = useLocation();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_SAVED)));
    } catch (error) {
      // ignore
    }

    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, open, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The admin screens have their own tools
  if (location.pathname.startsWith("/admin")) return null;

  const send = async (raw) => {
    const text = String(raw || "").trim();

    if (!text || busy) return;

    setInput("");
    setMessages((list) => [...list, { from: "user", text }]);
    setBusy(true);

    try {
      const { data } = await askAssistant(text);
      setMessages((list) => [...list, { from: "bot", text: data.reply, cards: data.cards, suggestions: data.suggestions }]);
    } catch (error) {
      const message = error.response?.data?.message || t("assistant.error");
      setMessages((list) => [...list, { from: "bot", text: message, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    send(input);
  };

  const last = messages[messages.length - 1];

  return (
    <>
      {!open && (
        <button type="button" className="assistant-fab" onClick={() => setOpen(true)} aria-label={t("assistant.open")}>
          <Sparkles size={22} />
          <span>{t("assistant.open")}</span>
        </button>
      )}

      {open && (
        <section className={`assistant-panel ${expanded ? "expanded" : ""}`} role="dialog" aria-label={tx("VOYARA travel assistant")}>
          <header className="assistant-head">
            <button type="button" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? "Make smaller" : "Make bigger"}>
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <Mascot />
            <div className="assistant-title">
              <strong>{t("assistant.title")}</strong>
              <span>{t("assistant.subtitle")}</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("assistant.close")}><X size={18} /></button>
          </header>

          <div className="assistant-body" ref={bodyRef} aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`assistant-msg ${m.from} ${m.error ? "error" : ""}`}>
                <p>{m.welcome ? t("assistant.welcome") : m.text}</p>

                {m.cards?.length > 0 && (
                  <div className="assistant-cards">
                    {m.cards.map((c) => (
                      <Link key={`${c.to}-${c.title}`} to={c.to} state={c.state} className={`assistant-card ${c.cta ? "cta" : ""}`} onClick={() => setOpen(false)}>
                        {c.image && <img src={c.image} alt="" loading="lazy" />}
                        <div>
                          <strong>{c.title}</strong>
                          <span>{c.subtitle}</span>
                        </div>
                        <ArrowRight size={16} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div className="assistant-msg bot typing" aria-label={tx("Assistant is typing")}>
                <i /><i /><i />
              </div>
            )}
          </div>

          {last?.from === "bot" && last.suggestions?.length > 0 && !busy && (
            <div className="assistant-chips">
              {last.suggestions.map((s) => (
                <button type="button" key={s} onClick={() => send(s)}><Bubble text={s} /></button>
              ))}
            </div>
          )}

          <form className="assistant-form" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("assistant.placeholder")}
              maxLength={300}
              aria-label={tx("Your question")}
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label={t("assistant.send")}><Bot size={22} /></button>
          </form>
        </section>
      )}
    </>
  );
};

export default AssistantWidget;
