import { useEffect } from "react";

import { prefersReducedMotion } from "../utils/motion";

// Things that fade up as they scroll into view. Fixed bars, modals and sticky panels are left out on purpose.
const SELECTOR = [
  ".section-header",
  ".mmt-row-head",
  ".card",
  ".feature-box",
  ".region-card",
  ".place-card",
  ".real-place-card",
  ".hotel-card",
  ".favorite-card",
  ".booking-card",
  ".addon-card",
  ".trip-stat-card",
  ".confirmation-card",
  ".voyara-admin-card",
  ".voyara-admin-metric",
  ".featured-slider",
  ".about-card",
  ".about-stat",
  ".contact-card",
  ".faq-item",
  ".about-cta",
].join(",");

const MAX_STAGGER = 8;
const STAGGER_MS = 70;

/**
 * Adds a gentle fade-up to cards and headings the first time they scroll into view.
 * Classes are removed once the effect is done, so hover effects keep working normally.
 */
const useScrollReveal = () => {
  useEffect(() => {
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") return undefined;

    const main = document.querySelector("main") || document.body;
    const seen = new WeakSet();

    const finish = (el) => {
      el.classList.remove("reveal", "reveal-in");
      el.style.transitionDelay = "";
    };

    const io = new IntersectionObserver(
      (entries) => {
        let order = 0;

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const el = entry.target;
          io.unobserve(el);

          el.style.transitionDelay = `${Math.min(order, MAX_STAGGER) * STAGGER_MS}ms`;
          order += 1;

          // next frame, so the browser has painted the hidden state first
          requestAnimationFrame(() => el.classList.add("reveal-in"));

          el.addEventListener("transitionend", () => finish(el), { once: true });
          setTimeout(() => finish(el), 1600); // safety net
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
    );

    const scan = () => {
      main.querySelectorAll(SELECTOR).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);

        if (el.closest(".no-reveal, .hotel-modal, .cancel-modal")) return;

        el.classList.add("reveal");
        io.observe(el);
      });
    };

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    };

    scan();

    const mo = new MutationObserver(schedule);
    mo.observe(main, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      io.disconnect();
    };
  }, []);
};

export default useScrollReveal;
