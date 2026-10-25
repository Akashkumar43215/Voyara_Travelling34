import { useRef } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

import useCarousel from "../hooks/useCarousel";
import { wideImage } from "../utils/motion";
import { useLanguage } from "../context/LanguageContext";

/**
 * Large "Featured journeys" slider. Slides move sideways, autoplay, can be swiped on a phone,
 * and work with the arrow keys. items: states from the API (name, slug, image, region, popularPlaces).
 */
const FeaturedSlider = ({ items, onOpen }) => {
  const { t: tx } = useLanguage();

  const count = items.length;
  const { index, go, next, prev, setPaused, pauseProps } = useCarousel(count, { interval: 7000 });
  const startX = useRef(null);

  if (!count) return null;

  const onPointerDown = (e) => {
    startX.current = e.clientX;
    setPaused(true);
  };

  const onPointerUp = (e) => {
    if (startX.current !== null) {
      const dx = e.clientX - startX.current;

      if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    }

    startX.current = null;
    setPaused(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  };

  return (
    <section className="section featured-section">
      <div className="container">
        <div className="mmt-row-head">
          <div>
            <h2 className="section-title">{tx("Featured Journeys")}</h2>
            <p className="section-desc">{tx("Hand-picked places to start planning your next trip")}</p>
          </div>

          <div className="mmt-row-arrows">
            <button type="button" onClick={prev} aria-label={tx("Previous journey")}>
              <ChevronLeft size={20} />
            </button>
            <button type="button" onClick={next} aria-label={tx("Next journey")}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div
          className="featured-slider"
          role="region"
          aria-roledescription="carousel"
          aria-label={tx("Featured journeys")}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          {...pauseProps}
        >
          <div className="featured-track" style={{ transform: `translateX(-${index * 100}%)` }}>
            {items.map((state, i) => {
              const places = Array.isArray(state.popularPlaces) ? state.popularPlaces.slice(0, 3).join(" · ") : "";

              return (
                <article
                  key={state.slug}
                  className={`featured-slide${i === index ? " is-active" : ""}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={tx("{i} of {count}: {name}", { i: i + 1, count, name: state.name })}
                  aria-hidden={i !== index}
                >
                  <img src={wideImage(state.image, 1400)} alt="" loading={i === 0 ? "eager" : "lazy"} draggable={false} />
                  <div className="featured-shade" />

                  <div className="featured-copy">
                    <span className="featured-tag">
                      <MapPin size={13} />
                      {state.type === "Union Territory" ? tx("Union Territory") : tx("State")}
                      {state.region ? ` · ${tx(state.region)}` : ""}
                    </span>

                    <h3>{tx(state.name)}</h3>

                    {places && <p>{places}</p>}

                    <button
                      type="button"
                      className="btn btn-primary"
                      tabIndex={i === index ? 0 : -1}
                      onClick={() => onOpen(state.slug)}
                    > {tx("Explore {name}", { name: state.name })} <ArrowRight size={16} /> </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="featured-dots" role="group" aria-label={tx("Choose a journey")}>
            {items.map((state, i) => (
              <button
                key={state.slug}
                type="button"
                className={i === index ? "is-active" : ""}
                aria-label={tx("Show {name}", { name: state.name })}
                aria-current={i === index}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedSlider;
