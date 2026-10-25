import { useEffect } from "react";
import { ArrowRight, MapPin } from "lucide-react";

import useCarousel from "../hooks/useCarousel";
import { useLanguage } from "../context/LanguageContext";

/**
 * Full-bleed photo slideshow behind the Home hero: the pictures cross-fade and drift slowly (Ken Burns),
 * with a caption that links to the place and dots to jump to a photo.
 * slides: [{ image, name, slug? }]
 */
const HeroSlides = ({ slides, onExplore }) => {
  const { t: tx } = useLanguage();

  const { index, go, pauseProps } = useCarousel(slides.length, { interval: 6500 });

  // load the next photo ahead of time so the cross-fade never shows a blank
  useEffect(() => {
    const upcoming = slides[(index + 1) % slides.length];
    if (upcoming) new Image().src = upcoming.image;
  }, [index, slides]);

  const current = slides[index] || slides[0];

  return (
    <>
      <div className="hero-slides" aria-hidden="true">
        {slides.map((slide, i) => (
          <div
            key={slide.image}
            className={`hero-slide${i === index ? " is-active" : ""}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          />
        ))}
      </div>

      {slides.length > 1 && (
        <div className="hero-slider-bar" {...pauseProps}>
          {current?.slug ? (
            <button type="button" className="hero-slider-caption" onClick={() => onExplore(current.slug)}>
              <MapPin size={15} />
              <span key={current.slug}>{tx(current.name)}</span>
              <em>
                {tx("Explore")} <ArrowRight size={14} />
              </em>
            </button>
          ) : (
            <span className="hero-slider-caption is-static">
              <MapPin size={15} />
              <span>{tx(current?.name)}</span>
            </span>
          )}

          <div className="hero-dots" role="group" aria-label={tx("Choose a photo")}>
            {slides.map((slide, i) => (
              <button
                key={slide.image}
                type="button"
                className={i === index ? "is-active" : ""}
                aria-label={tx("Show {name}", { name: slide.name })}
                aria-current={i === index}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default HeroSlides;
