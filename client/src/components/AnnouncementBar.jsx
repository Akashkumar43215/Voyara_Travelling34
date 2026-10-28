import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Sparkles, X } from "lucide-react";

import { prefersReducedMotion } from "../utils/motion";

const KEY = "voyara_banner_closed";

// Only true statements about what the site does: no prices or discounts here
const MESSAGES = [
  { text: "Plan your India trip across 36 states and union territories", short: "36 states and UTs to explore", cta: "Explore destinations", to: "/state-region" },
  { text: "Pick the places you want to see first, then book stays right next to them", short: "Book stays next to your places", cta: "Find stays", to: "/stays" },
  { text: "Stay, meals, local travel and activities in one booking", short: "Stay, meals and travel in one trip", cta: "Plan a trip", to: "/trip-builder" },
];

const ROTATE_MS = 5000;

const wasClosed = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch (error) {
    return false;
  }
};

/** Thin banner above the navbar. It scrolls away with the page and can be closed for the session. */
const AnnouncementBar = () => {
  const { pathname } = useLocation();
  const [closed, setClosed] = useState(wasClosed);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (closed || prefersReducedMotion()) return undefined;

    const timer = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), ROTATE_MS);

    return () => clearInterval(timer);
  }, [closed]);

  // The admin screens have their own header
  if (closed || pathname.startsWith("/admin")) return null;

  const close = () => {
    setClosed(true);

    try {
      sessionStorage.setItem(KEY, "1");
    } catch (error) {
      // storage can be blocked: it just comes back next visit
    }
  };

  return (
    <div className="announce" role="region" aria-label="Announcements">
      <div className="announce-inner">
        <Sparkles size={16} className="announce-icon" aria-hidden="true" />

        <div className="announce-viewport">
          {MESSAGES.map((m, i) => (
            <p key={m.text} className={i === index ? "on" : ""} aria-hidden={i !== index}>
              <span className="full">{m.text}</span>
              <span className="short">{m.short}</span>
              <Link to={m.to} tabIndex={i === index ? 0 : -1}>
                {m.cta} <ArrowRight size={14} />
              </Link>
            </p>
          ))}
        </div>

        <button type="button" className="announce-close" onClick={close} aria-label="Close announcement">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default AnnouncementBar;
