import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Compass,
  CreditCard,
  Info,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Utensils,
} from "lucide-react";

import PageHero from "../components/PageHero";
import CountUp from "../components/CountUp";
import { useLanguage } from "../context/LanguageContext";

const STEPS = [
  { icon: Search, title: "Search a city", text: "Type any Indian city, pick your dates and guests." },
  { icon: MapPin, title: "Pick your places", text: "Choose the sights you want to see. You can pick several." },
  { icon: Building2, title: "Hotels near them", text: "See hotels ranked by how close they are to every place you picked." },
  { icon: Utensils, title: "Add the extras", text: "Choose meals, a cab, bike or bus, and activities. Every one is optional." },
  { icon: CreditCard, title: "Book and manage", text: "Review one honest price, book, and cancel later from My Trips." },
];

const FEATURES = [
  {
    icon: MapPin,
    title: "Hotels by distance to your places",
    text: "Most sites list hotels by city. VOYARA shows how far each hotel is from every place on your list, so you stay close to what you came to see.",
  },
  {
    icon: ShieldCheck,
    title: "One price you can trust",
    text: "The total is worked out by our server from the room, meals, travel, activities and a 5% tax. The price you see is the price you pay.",
  },
  {
    icon: BadgeCheck,
    title: "Honest about what is real",
    text: "Hotel names, locations, restaurants and attractions come from map data. Facilities are marked \"listed\" only when the map confirms them.",
  },
  {
    icon: Sparkles,
    title: "Clear cancellation",
    text: "If a hotel offers free cancellation and check-in is more than 24 hours away, you get a full refund. You see the exact amount before you confirm.",
  },
  {
    icon: Smartphone,
    title: "Made for every screen",
    text: "From a small phone to a wide desktop, in light or dark mode. The booking flow works the same everywhere.",
  },
  {
    icon: Compass,
    title: "All of India",
    text: "Every one of the 36 states and union territories has at least five curated places, each with its own photo, timings and entry fee.",
  },
];

const FAQ = [
  {
    q: "Is the payment real?",
    a: "No. Payment in this version is a demo. No card is processed and no money moves. It only shows how the booking flow works.",
  },
  {
    q: "Are the hotel prices real?",
    a: "Hotel names and locations are real. Prices, most star classes and most amenities are generated, and they stay the same for each hotel. Facilities that the map data lists, such as Wi-Fi or parking, are marked \"listed\".",
  },
  {
    q: "How is my total worked out?",
    a: "Room price times rooms and nights, plus meals, local travel and activities you choose, plus 5% tax. Our server calculates it every time. Your browser only sends your choices, never a price.",
  },
  {
    q: "How does cancellation work?",
    a: "Open My Trips and press Cancel. If the hotel offers free cancellation and check-in is more than 24 hours away, you get a full refund. Otherwise the booking is cancelled with no refund. You see the amount before you confirm.",
  },
  {
    q: "Do I need an account?",
    a: "You can explore places, search hotels and plan a trip without one. You need a free account to enter traveler details and book, and your trip is kept while you log in.",
  },
  {
    q: "Is my information safe?",
    a: "Passwords are stored as one-way hashes, never as plain text. Booking pages are only visible to the person who made the booking, and the site uses security headers and rate limits.",
  },
  {
    q: "Can I find hotels in a small town?",
    a: "Usually yes. Hotels come from community map data, so some areas have fewer hotels and details than big cities.",
  },
];

const About = () => {
  const { t: tx } = useLanguage();

  const { hash } = useLocation();

  // /about#faq scrolls to the questions
  useEffect(() => {
    if (!hash) return undefined;

    const timer = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);

    return () => clearTimeout(timer);
  }, [hash]);

  return (
    <div className="about-page">
      <PageHero
        eyebrow={tx("About VOYARA")}
        icon={<Info />}
        title={
          <>{tx("Plan the whole trip,")} <span>{tx("near the places you love")}</span></>
        }
        subtitle={tx("VOYARA helps you explore India, find hotels close to the sights you want to see, and book your stay, food and travel in one simple flow.")}
        actions={
          <Link to="/contact" className="page-hero-btn">
            <MessageCircle size={17} />
            {tx("Talk to us")}
          </Link>
        }
      />

      {/* ---------- Story ---------- */}
      <section className="section about-section">
        <div className="container about-story">
          <div className="about-story-text">
            <span className="section-tag">{tx("Our story")}</span>
            <h2 className="section-title">{tx("Planning a trip should not need ten tabs")}</h2>

            <p>
              {tx("Planning a trip in India usually means one site to find what to see, another for a hotel, another for food and another for a cab. And hotel sites list rooms by city, not by how close they are to the places you actually want to visit.")}
            </p>
            <p>
              {tx("VOYARA puts it all in one flow. You start with the places, we show the hotels around them, and you add meals, local travel and activities as you go. You always see one total before you book.")}
            </p>
            <p>
              {tx("VOYARA is a demonstration project built with MongoDB, Express, React and Node. It uses real map data where it exists and says clearly where it uses estimates.")}
            </p>

            <div className="about-story-actions">
              <Link to="/state-region" className="btn btn-primary">
                {tx("Explore destinations")} <ArrowRight size={16} />
              </Link>
              <Link to="/stays" className="btn btn-outline">
                {tx("Find a stay")}
              </Link>
            </div>
          </div>

          <div className="about-stats">
            <div className="about-stat">
              <strong>
                <CountUp to={36} />
              </strong>
              <span>{tx("States and union territories")}</span>
            </div>
            <div className="about-stat">
              <strong>
                <CountUp to={234} />
              </strong>
              <span>{tx("Curated places")}</span>
            </div>
            <div className="about-stat">
              <strong>
                <CountUp to={9} />
              </strong>
              <span>{tx("Simple booking steps")}</span>
            </div>
            <div className="about-stat">
              <strong>
                <CountUp to={24} suffix="h" />
              </strong>
              <span>{tx("Free-cancellation cut-off")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="section about-section about-alt">
        <div className="container">
          <div className="section-header about-head">
            <div>
              <span className="section-tag">{tx("How it works")}</span>
              <h2 className="section-title">{tx("From search to booking in five steps")}</h2>
            </div>
          </div>

          <ol className="about-steps">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="about-card about-step">
                <span className="about-step-number">{i + 1}</span>
                <span className="about-icon">
                  <Icon size={22} />
                </span>
                <h3>{tx(title)}</h3>
                <p>{tx(text)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- What makes it different ---------- */}
      <section className="section about-section">
        <div className="container">
          <div className="section-header about-head">
            <div>
              <span className="section-tag">{tx("Why VOYARA")}</span>
              <h2 className="section-title">{tx("Built around the traveler")}</h2>
            </div>
          </div>

          <div className="about-features">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="about-card about-feature">
                <span className="about-icon">
                  <Icon size={22} />
                </span>
                <h3>{tx(title)}</h3>
                <p>{tx(text)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Real vs demo ---------- */}
      <section className="section about-section about-alt">
        <div className="container">
          <div className="section-header about-head">
            <div>
              <span className="section-tag">{tx("Be clear")}</span>
              <h2 className="section-title">{tx("What is real and what is a demo")}</h2>
            </div>
          </div>

          <div className="about-truth">
            <article className="about-card about-truth-card is-real">
              <h3>
                <BadgeCheck size={20} /> {tx("Real")}
              </h3>
              <ul>
                <li>{tx("Hotel and restaurant names and locations")}</li>
                <li>{tx("Distances to the places you pick")}</li>
                <li>{tx("Nearby attractions")}</li>
                <li>{tx("Wi-Fi, parking, phone and website, when the map lists them")}</li>
                <li>{tx("36 states and UTs and 234 curated landmarks")}</li>
              </ul>
            </article>

            <article className="about-card about-truth-card is-demo">
              <h3>
                <Sparkles size={20} /> {tx("Demo or estimated")}
              </h3>
              <ul>
                <li>{tx("Hotel room prices")}</li>
                <li>{tx("Most star classes and amenities")}</li>
                <li>{tx("Meal, vehicle and activity prices")}</li>
                <li>{tx("Free-cancellation flag per hotel")}</li>
                <li>{tx("Payment (no money moves)")}</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="section about-section" id="faq">
        <div className="container about-faq-wrap">
          <div className="section-header about-head">
            <div>
              <span className="section-tag">{tx("Questions")}</span>
              <h2 className="section-title">{tx("Frequently asked questions")}</h2>
            </div>
          </div>

          <div className="about-faq">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="faq-item">
                <summary>{tx(q)}</summary>
                <p>{tx(a)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Call to action ---------- */}
      <section className="section about-section">
        <div className="container">
          <div className="about-cta">
            <div>
              <h2>{tx("Ready to plan your trip?")}</h2>
              <p>{tx("Pick a city, choose your places and see the hotels around them.")}</p>
            </div>

            <div className="about-cta-actions">
              <Link to="/" className="btn btn-primary">
                {tx("Start planning")} <ArrowRight size={16} />
              </Link>
              <Link to="/contact" className="page-hero-btn">
                {tx("Contact us")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
