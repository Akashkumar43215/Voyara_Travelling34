import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Display-only ideas. No discount is promised or applied: prices always come from the server.
const OFFERS = [
  { tab: "Stays", title: "Weekend getaway", text: "Pick a city, choose a stay near the sights and book in a few steps.", to: "/stays", cta: "Find stays" },
  { tab: "Stays", title: "Heritage and palaces", text: "Browse curated forts, temples and palaces, then find hotels nearby.", to: "/state-region", cta: "Explore places" },
  { tab: "Trips", title: "Build a full trip", text: "Add meals, travel and activities to your room in one booking.", to: "/trip-builder", cta: "Plan a trip" },
  { tab: "Trips", title: "Hills and beaches", text: "From the Himalayas to Goa, start with a region that suits your season.", to: "/state-region", cta: "Browse regions" },
  { tab: "Help", title: "Ask the VOYARA assistant", text: "Get itinerary tips and check your bookings by chatting.", to: "/trips", cta: "My trips" },
];

const OFFER_TABS = ["All", "Stays", "Trips", "Help"];

export const OffersStrip = () => {
  const [tab, setTab] = useState("All");
  const shown = OFFERS.filter((o) => tab === "All" || o.tab === tab);

  return (
    <section className="section">
      <div className="container">
        <div className="hs-head">
          <h2 className="section-title">Ways to plan with VOYARA</h2>
          <div className="hs-tabs" role="tablist">
            {OFFER_TABS.map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={tab === name}
                className={tab === name ? "active" : ""}
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="hs-offers">
          {shown.map((o) => (
            <article key={o.title} className="hs-offer">
              <h3>{o.title}</h3>
              <p>{o.text}</p>
              <Link to={o.to}>
                {o.cta} <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export const PopularGrid = ({ states }) => {
  if (!states.length) return null;

  return (
    <section className="section section-alt">
      <div className="container">
        <h2 className="section-title">Popular destinations</h2>
        <p className="section-desc">Jump straight to the places and stays of a state or union territory.</p>

        <div className="hs-grid">
          {states.slice(0, 12).map((s) => (
            <Link key={s.slug} to={`/places/${s.slug}`} className="hs-dest">
              <img src={s.image} alt="" loading="lazy" />
              <span>
                <strong>{s.name}</strong>
                <small>{s.region ? `${s.region} India` : s.type}</small>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQS = [
  ["How do I book a stay on VOYARA?", "Search a city, pick the places you want to see, choose a hotel near them, then select a room, dates, meals and activities. Review the trip and pay at the end."],
  ["How do I find the cheapest stay?", "Open the stays list and sort by price from low to high. Every price is worked out by our server, so the total you see at review is the total you pay."],
  ["Can I cancel or change my dates?", "Yes. Open My Trips to see the cancellation policy and the refund before you confirm. Free cancellation applies when the hotel offers it and check-in is more than 24 hours away."],
  ["Is payment real?", "Checkout runs in demo mode until online payment is switched on. Card and UPI details are never sent to our server."],
];

export const HomeFaq = () => (
  <section className="section">
    <div className="container">
      <h2 className="section-title">Frequently asked questions</h2>

      <div className="hs-faq">
        {FAQS.map(([q, a]) => (
          <div key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
