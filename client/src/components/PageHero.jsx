import React from "react";

/**
 * The one banner every inner page starts with, so moving between pages feels like one product.
 * eyebrow: small badge text, icon: lucide icon element shown in the badge,
 * actions: buttons shown on the right, children: anything that sits at the bottom (e.g. a search box).
 */
const PageHero = ({ eyebrow, icon, title, subtitle, actions, children, compact = false, center = false }) => (
  <section className={`page-hero${compact ? " compact" : ""}${center ? " center" : ""}`}>
    <div className="container">
      <div className="page-hero-row">
        <div className="page-hero-text">
          {eyebrow && (
            <div className="page-hero-badge">
              {icon}
              <span>{eyebrow}</span>
            </div>
          )}
          <h1 className="page-hero-title">{title}</h1>
          {subtitle && <p className="page-hero-sub">{subtitle}</p>}
        </div>
        {actions && <div className="page-hero-actions">{actions}</div>}
      </div>
      {children}
    </div>
  </section>
);

export default PageHero;
