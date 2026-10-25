import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Hotel,
  ArrowRight,
  Check,
  Clock,
  Coffee,
  Mail,
  MapPin,
  Moon,
  Phone,
  ShieldCheck,
  Sparkles,
  Sun,
  Utensils,
} from "lucide-react";

import TripPriceSummary from "../components/TripPriceSummary";
import { getAddonCatalog, getNearbyRestaurants } from "../services/api";
import { formatMeters } from "../utils/geo";
import { formatMoney, hasTripBasics, stateForNext, tripFromState } from "../utils/trip";
import PageHero from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";

const MEAL_ICONS = { breakfast: Coffee, lunch: Sun, dinner: Moon };

const MealsFacilities = () => {
  const { t: tx } = useLanguage();

  const location = useLocation();
  const navigate = useNavigate();

  const trip = useMemo(() => tripFromState(location.state), [location.state]);

  const [meals, setMeals] = useState(trip.meals);
  const [catalog, setCatalog] = useState(null);
  const [restaurants, setRestaurants] = useState({ loading: true, data: [] });

  const stay = trip.selectedStay;
  const roomPrice = Number(trip.selectedRoom?.pricePerNight || 0);

  useEffect(() => {
    if (!roomPrice) return;

    getAddonCatalog(roomPrice)
      .then((res) => setCatalog(res.data))
      .catch(() => setCatalog(null));
  }, [roomPrice]);

  useEffect(() => {
    if (!stay?.latitude || !stay?.longitude) {
      setRestaurants({ loading: false, data: [] });
      return undefined;
    }

    let active = true;

    getNearbyRestaurants({ lat: stay.latitude, lon: stay.longitude, radius: 1500, limit: 12 })
      .then((res) => active && setRestaurants({ loading: false, data: res.data || [] }))
      .catch(() => active && setRestaurants({ loading: false, data: [] }));

    return () => {
      active = false;
    };
  }, [stay?.latitude, stay?.longitude]);

  if (!hasTripBasics(trip)) {
    return (
      <div className="real-places-empty">
        <Utensils size={44} />
        <h2>{tx("Your trip details are missing")}</h2>
        <p>{tx("Please start from your stay selection so we know which hotel and room to add meals to.")}</p>
        <button className="btn btn-primary" onClick={() => navigate("/stays")}>
          <ArrowLeft size={17} />
          {tx("Choose a stay")}
        </button>
      </div>
    );
  }

  const prices = catalog?.mealPrices || {};
  const guestUnits = trip.adults + trip.children * 0.5;

  const activePlanId =
    catalog?.mealPlans.find(
      (plan) =>
        ["breakfast", "lunch", "dinner"].every((m) => plan.meals.includes(m) === Boolean(meals[m]))
    )?.id || "custom";

  const choosePlan = (plan) =>
    setMeals({
      breakfast: plan.meals.includes("breakfast"),
      lunch: plan.meals.includes("lunch"),
      dinner: plan.meals.includes("dinner"),
    });

  const toggleMeal = (key) => setMeals((current) => ({ ...current, [key]: !current[key] }));

  const planTotal = (plan) => Math.round(plan.pricePerPersonPerNight * guestUnits * trip.nights);

  const verified = stay.amenitiesVerified || [];
  const facilities = stay.amenities || [];
  const contact = stay.facilities || {};

  const handleContinue = () => {
    navigate("/add-ons", { state: stateForNext(trip, { meals }) });
  };

  const nextTrip = { ...trip, meals };

  return (
    <div className="addon-page">
      <PageHero
        compact
        eyebrow={tx("STEP 4 OF 9 · MEALS & FACILITIES")}
        icon={<Hotel />}
        title={<>{tx("Food and facilities at {name}", { name: stay.name })}</>}
        subtitle={<>{tx("Choose whether meals are included or excluded, and see what the hotel offers.")}</>}
        actions={
          <button className="page-hero-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
            {tx("Back to availability")}
          </button>
        }
      />

      <div className="container addon-layout">
        <main className="addon-main">
          {/* ---------- Meal plan ---------- */}
          <section className="addon-card">
            <h2>
              <Utensils size={19} /> {tx("Food: included or excluded")}
            </h2>
            <p className="addon-sub">
              {tx("Prices are per person per night at this hotel. Children under 12 eat at half price. Meals are served at the hotel restaurant.")}
            </p>

            <div className="meal-plans">
              {(catalog?.mealPlans || []).map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  className={`meal-plan ${activePlanId === plan.id ? "active" : ""}`}
                  onClick={() => choosePlan(plan)}
                >
                  <span className="meal-plan-tick">{activePlanId === plan.id && <Check size={14} />}</span>
                  <strong>{tx(plan.label)}</strong>
                  <em>{tx(plan.short)}</em>
                  <small>{tx(plan.description)}</small>
                  <span className="meal-plan-price">
                    {plan.pricePerPersonPerNight === 0 ? (
                      tx("No extra cost")
                    ) : (
                      <>
                        + {formatMoney(plan.pricePerPersonPerNight)} <i>{tx("per person / night")}</i>
                        <b>{tx("{amount} for your stay", { amount: formatMoney(planTotal(plan)) })}</b>
                      </>
                    )}
                  </span>
                </button>
              ))}
            </div>

            <h3 className="addon-subhead">{tx("Or pick meals one by one")} {activePlanId === "custom" && <span className="chip">{tx("Custom")}</span>}</h3>

            <div className="meal-toggles">
              {["breakfast", "lunch", "dinner"].map((key) => {
                const Icon = MEAL_ICONS[key];
                return (
                  <label key={key} className={`meal-toggle ${meals[key] ? "on" : ""}`}>
                    <input type="checkbox" checked={Boolean(meals[key])} onChange={() => toggleMeal(key)} />
                    <Icon size={20} />
                    <span>
                      <strong>{key === "breakfast" ? tx("Breakfast (B)") : key === "lunch" ? tx("Lunch (L)") : tx("Dinner (D)")}</strong>
                      <small>{prices[key] ? tx("{price} per person / night", { price: formatMoney(prices[key]) }) : "..."}</small>
                    </span>
                  </label>
                );
              })}
            </div>

            {!meals.breakfast && !meals.lunch && !meals.dinner && (
              <p className="addon-note">
                {tx("Food excluded. You can eat at the restaurants near the hotel (listed below) or order in.")}
              </p>
            )}
          </section>

          {/* ---------- Hotel facilities ---------- */}
          <section className="addon-card">
            <h2>
              <Sparkles size={19} /> {tx("Hotel facilities")}
            </h2>

            <ul className="facility-grid">
              {facilities.map((f) => (
                <li key={f} className={verified.includes(f) ? "verified" : ""}>
                  <Check size={15} />
                  {f}
                  {verified.includes(f) && <em>{tx("✓ listed")}</em>}
                </li>
              ))}
            </ul>

            <p className="addon-fine">
              {verified.length
                ? tx("✓ listed means the property itself lists this facility. The others are typical for this kind of property, so confirm with the hotel.")
                : tx("These facilities are typical for this kind of property. Confirm with the hotel before you travel.")}
            </p>

            <ul className="addon-rules">
              <li>
                <Clock size={15} /> {tx("Check-in from 12:00 PM, check-out by 11:00 AM")}
              </li>
              <li>
                <ShieldCheck size={15} />
                {stay.freeCancellation
                  ? tx("Free cancellation until 24 hours before check-in")
                  : tx("Non-refundable: this property does not offer free cancellation")}
              </li>
              {contact.phone && (
                <li>
                  <Phone size={15} /> {contact.phone}
                </li>
              )}
              {contact.email && (
                <li>
                  <Mail size={15} /> {contact.email}
                </li>
              )}
            </ul>
          </section>

          {/* ---------- Eating out ---------- */}
          <section className="addon-card">
            <h2>
              <MapPin size={19} /> {tx("Restaurants near your hotel")}
            </h2>
            <p className="addon-sub">{tx("Real places within 1.5 km, from the map data.")}</p>

            {restaurants.loading && <p className="addon-fine">{tx("Finding places to eat...")}</p>}

            {!restaurants.loading && restaurants.data.length === 0 && (
              <p className="addon-fine">{tx("No restaurants were found nearby in the map data.")}</p>
            )}

            <ul className="resto-grid">
              {restaurants.data.map((r) => (
                <li key={r.placeId}>
                  <div>
                    <strong>{tx(r.name)}</strong>
                    <small>
                      {tx(r.type)}
                      {r.cuisines.length > 0 && ` · ${r.cuisines.slice(0, 3).join(", ")}`}
                    </small>
                    {r.openingHours && <small>{tx("Hours: {hours}", { hours: r.openingHours })}</small>}
                  </div>
                  <div className="resto-meta">
                    {r.vegetarianOnly ? <span className="tag veg">{tx("Pure veg")}</span> : r.vegetarian && <span className="tag veg">{tx("Veg options")}</span>}
                    {r.halal && <span className="tag">{tx("Halal")}</span>}
                    {r.distance != null && <em>{formatMeters(r.distance)}</em>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <div className="addon-side">
          <TripPriceSummary trip={nextTrip}>
            <button type="button" className="btn btn-primary addon-continue" onClick={handleContinue}>
              {tx("Continue to travel & activities")} <ArrowRight size={17} />
            </button>
          </TripPriceSummary>
        </div>
      </div>
    </div>
  );
};

export default MealsFacilities;
