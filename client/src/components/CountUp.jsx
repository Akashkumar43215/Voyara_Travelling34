import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "../utils/motion";

/** A number that counts up from zero the first time it is seen. */
const CountUp = ({ to, suffix = "", duration = 1400 }) => {
  const ref = useRef(null);
  const [value, setValue] = useState(prefersReducedMotion() ? to : 0);

  useEffect(() => {
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setValue(to);
      return undefined;
    }

    let frame = 0;

    const run = () => {
      const start = performance.now();

      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // slows down towards the end

        setValue(Math.round(to * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };

      frame = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 }
    );

    if (ref.current) io.observe(ref.current);

    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [to, duration]);

  return (
    <b ref={ref} className="count-up" aria-label={`${to}${suffix}`}>
      {value.toLocaleString("en-IN")}
      {suffix}
    </b>
  );
};

export default CountUp;
