import { useCallback, useEffect, useState } from "react";

import { prefersReducedMotion } from "../utils/motion";

/**
 * Slide index with autoplay. Autoplay stops while the visitor hovers or focuses the slider, while the
 * browser tab is hidden, and always when the device asks for reduced motion.
 */
const useCarousel = (count, { interval = 6000, autoplay = true } = {}) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((i) => setIndex(count ? ((i % count) + count) % count : 0), [count]);
  const next = useCallback(() => setIndex((i) => (count ? (i + 1) % count : 0)), [count]);
  const prev = useCallback(() => setIndex((i) => (count ? (i - 1 + count) % count : 0)), [count]);

  useEffect(() => {
    if (!autoplay || paused || count < 2 || prefersReducedMotion()) return undefined;

    // restarts whenever the slide changes, so a manual click gets a full interval
    const id = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, interval);

    return () => clearInterval(id);
  }, [autoplay, paused, count, interval, index]);

  const pauseProps = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
  };

  return { index, go, next, prev, paused, setPaused, pauseProps };
};

export default useCarousel;
