import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// Pages show a sticky action bar at the bottom (selected stay, selected places...).
// The button sits above it so the two never overlap.
const BOTTOM_BARS =
  ".real-places-selection-bar, .stays-selection-bar, .availability-selection-bar";

const SHOW_AFTER_PX = 400;

/**
 * Two small jobs:
 * 1. Opening a new page starts at the top (a single-page app otherwise keeps the old scroll position).
 * 2. A round "back to top" button appears once you have scrolled down.
 */
const ScrollToTop = () => {
  const { t: tx } = useLanguage();

  const { pathname, hash } = useLocation();
  const [visible, setVisible] = useState(false);
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    // Links like #why-voyara scroll to their own section instead
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  useEffect(() => {
    const update = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
      setLifted(Boolean(document.querySelector(BOTTOM_BARS)));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  return (
    <button
      type="button"
      className={`scroll-top-btn ${visible ? "show" : ""} ${lifted ? "lifted" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={tx("Back to top")}
      title={tx("Back to top")}
      tabIndex={visible ? 0 : -1}
    >
      <ArrowUp size={20} />
    </button>
  );
};

export default ScrollToTop;
