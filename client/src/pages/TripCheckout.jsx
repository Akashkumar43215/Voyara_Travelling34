import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Mail, MapPin, Phone, Plus, Route, User } from "lucide-react";

import PageHero from "../components/PageHero";
import TripLegs from "../components/TripLegs";
import useTripQuote from "../hooks/useTripQuote";
import { createBooking } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { bookingPayload, formatMoney, tripFromState } from "../utils/trip";
import { MAX_CITIES, cityOf, clearCart, getCart, markBooked, onCartChange, removeLeg } from "../utils/tripCart";

// The server's price for one stop, shown next to it
const LegPrice = ({ leg, onTotal }) => {
  const { quote } = useTripQuote(tripFromState(leg));

  useEffect(() => {
    onTotal(leg.key, quote ? quote.totalAmount : null);
  }, [quote]);

  return <span className="leg-price">{quote ? formatMoney(quote.totalAmount) : "..."}</span>;
};

/**
 * Last step of a multi-city trip: one traveler, every saved city.
 * Each city becomes its own booking (same trip id) and is paid on its own, one after the other.
 * Prices are only displayed here: the server works out every amount when it creates a booking.
 */
const TripCheckout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [cart, setCart] = useState(getCart);
  const [traveler, setTraveler] = useState({ name: user?.name || "", email: user?.email || "", phone: "" });
  const [totals, setTotals] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => onCartChange(() => setCart(getCart())), []);

  const setTotal = useCallback((key, value) => setTotals((current) => (current[key] === value ? current : { ...current, [key]: value })), []);

  const legs = cart.legs;
  const priced = legs.every((leg) => typeof totals[leg.key] === "number");
  const total = legs.reduce((sum, leg) => sum + (totals[leg.key] || 0), 0);

  const handleChange = (event) => setTraveler((current) => ({ ...current, [event.target.name]: event.target.value }));

  const problem = () => {
    if (traveler.name.trim().length < 2) return "Please enter the traveler's full name.";
    if (!/^\S+@\S+\.\S+$/.test(traveler.email.trim())) return "Please enter a valid email address.";
    if (traveler.phone.replace(/\D/g, "").length < 10) return "Please enter a phone number with at least 10 digits.";

    return "";
  };

  const confirm = async () => {
    const issue = problem();

    if (issue) return setError(issue);

    setError("");
    setBusy(true);

    let current = getCart();

    for (const leg of current.legs) {
      // already booked on an earlier try: never book a city twice
      if (leg.booking) continue;

      try {
        const response = await createBooking(bookingPayload(leg, traveler, current.tripId));

        if (!response?.success) throw new Error(response?.message || "Unable to create the booking.");

        current = markBooked(leg.key, response.data);
      } catch (err) {
        setCart(getCart());
        setError(`${cityOf(leg)}: ${err.response?.data?.message || err.message || "Could not create the booking."}`);
        setBusy(false);

        return;
      }
    }

    const bookings = current.legs.map((leg) => leg.booking);

    clearCart();
    navigate("/payment", { state: { booking: bookings[0], trip: { pending: bookings.slice(1), paid: [] } } });
  };

  if (legs.length === 0) {
    return (
      <div className="real-places-empty">
        <Route size={44} />
        <h2>No cities saved yet</h2>
        <p>Build a trip, then use "Add another city" on the Build Your Trip page to put several cities in one booking.</p>
        <button className="btn btn-primary" onClick={() => navigate("/")}>
          <ArrowLeft size={17} />
          Back to Home
        </button>
      </div>
    );
  }

  const bookedCount = legs.filter((leg) => leg.booking).length;

  return (
    <div className="trip-builder-page">
      <PageHero
        compact
        eyebrow="MULTI-CITY TRIP · FINAL STEP"
        icon={<Route />}
        title="Your multi-city trip"
        subtitle={`${legs.map(cityOf).join(" → ")}. Each city is booked and paid for on its own.`}
        actions={
          <button className="page-hero-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
            Back
          </button>
        }
      />

      <section className="section">
        <div className="container">
          <div className="addon-layout">
            <div className="addon-main">
              <div className="dates-form-card">
                <div className="dates-form-heading">
                  <MapPin size={24} />
                  <div>
                    <h2>Your cities</h2>
                    <p>{legs.length} {legs.length === 1 ? "city" : "cities"}, in date order. Dates of different cities never overlap.</p>
                  </div>
                </div>

                <TripLegs legs={legs} onRemove={busy ? undefined : (key) => !legs.find((l) => l.key === key)?.booking && removeLeg(key)}>
                  {(leg) =>
                    leg.booking ? (
                      <span className="leg-booked"><Check size={13} /> Booked, payment pending</span>
                    ) : (
                      <LegPrice leg={leg} onTotal={setTotal} />
                    )
                  }
                </TripLegs>

                <button
                  type="button"
                  className="btn leg-add"
                  disabled={busy || legs.length >= MAX_CITIES}
                  onClick={() => navigate("/state-region", { state: { addingCity: true } })}
                >
                  <Plus size={16} />
                  {legs.length >= MAX_CITIES ? `Up to ${MAX_CITIES} cities per trip` : "Add another city"}
                </button>
              </div>

              <div className="booking-form-card">
                <div className="booking-form-heading">
                  <User size={24} />
                  <div>
                    <h2>Traveler details</h2>
                    <p>One contact for every city of this trip.</p>
                  </div>
                </div>

                <div className="booking-form">
                  <div className="booking-field">
                    <label htmlFor="mc-name">Full name</label>
                    <div className="booking-input">
                      <User size={18} />
                      <input id="mc-name" name="name" value={traveler.name} onChange={handleChange} autoComplete="name" placeholder="Enter full name" />
                    </div>
                  </div>

                  <div className="booking-field">
                    <label htmlFor="mc-email">Email address</label>
                    <div className="booking-input">
                      <Mail size={18} />
                      <input id="mc-email" type="email" name="email" value={traveler.email} onChange={handleChange} autoComplete="email" placeholder="Enter email address" />
                    </div>
                  </div>

                  <div className="booking-field">
                    <label htmlFor="mc-phone">Phone number</label>
                    <div className="booking-input">
                      <Phone size={18} />
                      <input id="mc-phone" type="tel" name="phone" value={traveler.phone} onChange={handleChange} autoComplete="tel" inputMode="tel" placeholder="Enter phone number" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="addon-side">
              <aside className="trip-summary">
                <h2>Trip summary</h2>

                <div className="trip-summary-lines">
                  {legs.map((leg) => (
                    <div key={leg.key}>
                      <span>{cityOf(leg)} <small>{leg.nights} {leg.nights === 1 ? "night" : "nights"}</small></span>
                      <strong>{typeof totals[leg.key] === "number" ? formatMoney(totals[leg.key]) : "..."}</strong>
                    </div>
                  ))}
                </div>

                <div className="trip-summary-total">
                  <span>All cities</span>
                  <strong>{priced ? formatMoney(total) : "..."}</strong>
                </div>

                <p className="trip-summary-note">
                  You pay city by city: {legs.length - bookedCount === 1 ? "1 payment" : `${legs.length - bookedCount} payments`}, one after the other. Amounts are calculated by VOYARA, so each is what you will be charged.
                </p>

                {error && <p className="trip-summary-error">{error}</p>}

                <button type="button" className="btn btn-primary addon-continue" disabled={busy} onClick={confirm}>
                  {busy ? (
                    <>
                      <Loader2 size={17} className="spin" /> Booking your cities...
                    </>
                  ) : (
                    <>
                      Confirm and pay <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TripCheckout;
