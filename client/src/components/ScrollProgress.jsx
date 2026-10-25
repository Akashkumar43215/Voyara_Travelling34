import { useEffect, useRef } from "react";

/** A thin blue line at the very top of the page that fills as you scroll down. */
const ScrollProgress = () => {
  const bar = useRef(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;

      if (bar.current) bar.current.style.transform = `scaleX(${ratio})`;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return <div className="scroll-progress" aria-hidden="true"><span ref={bar} /></div>;
};

export default ScrollProgress;
