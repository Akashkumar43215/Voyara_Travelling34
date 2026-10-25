import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Hotel,
  ArrowRight,
  Bike,
  Bus,
  Car,
  Check,
  Compass,
  Minus,
  Plus,
  Ticket,
  X,
} from "lucide-react";

import TripPriceSummary from "../components/TripPriceSummary";
import { getAddonCatalog, getNearbyActivities } from "../services/api";
import { formatMeters } from "../utils/geo";
import { formatMoney, hasTripBasics, stateForNext, tripFromState } from "../utils/trip";
import PageHero from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { plural } from "../i18n/plural";

const MODE_ICONS = { cab: Car, suv: Car, bike: Bike, bus: Bus };

const TravelActivities = () => {
  const { t: tx } = useLanguage();

  const location = useLocation();
  const navigate = useNavigate();

  const trip = useMemo(() => tripFromState(location.state), [location.state]);

  const guests = trip.adults + trip.children;
  const defaultDays = trip.nights + 1;

  const [transport, setTransport] = useState(trip.transport);
  const [activities, setActivities] = useState(trip.activities);
  const [catalog, setCatalog] = useState(null);
  const [options, setOptions] = useState({ loading: true, experiences: [], nearby: [] });

  const stay = trip.selectedStay;
  const roomPrice = Number(trip.selectedRoom?.pricePerNight || 0);

  useEffect(() => {
    if (!roomPrice) return;

    getAddonCatalog(roomPrice)
      .then((res) => setCatalog(res.data))
      .catch(() => setCatalog(null));
  }, [roomPrice]);

  useEffect(() => {
    const lat = stay?.latitude ?? trip.location?.latitude;
    const lon = stay?.longitude ?? trip.location?.longitude;

    if (lat == null || lon == null) {
      setOptions({ loading: false, experiences: [], nearby: [] });
      return undefined;
    }

    let active = true;

    getNearbyActivities({ lat, lon, radius: 8000 })
      .then((res) =>
        active &&
        setOptions({ loading: false, experiences: res.data?.experiences || [], nearby: res.data?.nearby || [] })
      )
      .catch(() => active && setOptions({ loading: false, experiences: [], nearby: [] }));

    return () => {
      active = false;
    };
  }, [stay?.latitude, stay?.longitude, trip.location?.latitude, trip.location?.longitude]);

  if (!hasTripBasics(trip)) {
    return (
      <div className="real-places-empty">
        <Compass size={44} />
        <h2>{tx("Your trip details are missing")}</h2>
        <p>{tx("Please start from your stay selection so we know where to add travel and activities.")}</p>
        <button className="btn btn-primary" onClick={() => navigate("/stays")}>
          <ArrowLeft size={17} />
          {tx("Choose a stay")}
        </button>
      </div>
    );
  }

  const modes = catalog?.transport || [];
  const currentMode = modes.find((m) => m.id === transport?.mode);

  /* ---------------- transport ---------------- */

  const pickMode = (mode) => {
    if (!mode) {
      setTransport(null);
      return;
    }

    const hasAc = Boolean(mode.prices.ac);

    setTransport({
      mode: mode.id,
      ac: hasAc,
      vehicles: Math.max(1, Math.ceil(guests / mode.seats)),
      days: defaultDays,
    });
  };

  const patchTransport = (changes) => setTransport((current) => ({ ...current, ...changes }));

  const minVehicles = currentMode ? Math.max(1, Math.ceil(guests / currentMode.seats)) : 1;

  const perDay = currentMode ? (transport.ac ? currentMode.prices.ac : currentMode.prices.nonAc) : 0;

  /* ---------------- activities ---------------- */

  const isAdded = (id) => activities.some((a) => a.id === id);

  const toggleActivity = (item) =>
    setActivities((list) =>
      list.some((a) => a.id === item.id)
        ? list.filter((a) => a.id !== item.id)
        : [...list, { id: item.id, name: item.name, unit: item.unit, price: item.price, real: item.real }]
    );

  const amountFor = (item) => (item.unit === "group" ? item.price : item.price * guests);

  const handleContinue = () => {
    navigate("/trip-builder", { state: stateForNext(trip, { transport, activities }) });
  };

  const nextTrip = { ...trip, transport, activities };

  const ActivityRow = ({ item }) => (
    <li className={isAdded(item.id) ? "added" : ""}>
      <div>
        <strong>{tx(item.name)}</strong>
        <small>
          {item.kind}
          {item.distance != null && tx(" · {dist} from your hotel", { dist: formatMeters(item.distance) })}
        </small>
        {item.description && <small>{tx(item.description)}</small>}
      </div>

      <div className="activity-price">
        <strong>{formatMoney(item.price)}</strong>
        <small>{item.unit === "group" ? tx("per group") : tx("per person · {amount} for {n}", { amount: formatMoney(amountFor(item)), n: guests })}</small>
      </div>

      <button type="button" className={`activity-btn ${isAdded(item.id) ? "added" : ""}`} onClick={() => toggleActivity(item)}>
        {isAdded(item.id) ? (
          <>
            <Check size={14} /> {tx("Added")}
          </>
        ) : (
          <>
            <Plus size={14} /> {tx("Add")}
          </>
        )}
      </button>
    </li>
  );

  return (
    <div className="addon-page">
      <PageHero
        compact
        eyebrow={tx("STEP 5 OF 9 · TRAVEL & ACTIVITIES (OPTIONAL)")}
        icon={<Hotel />}
        title={<>{tx("Getting around and things to do")}</>}
        subtitle={<>{tx("Add a car, bike or bus for your stay, and extra activities near {name}. You can skip both.", { name: stay.name })}</>}
        actions={
          <button className="page-hero-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
            {tx("Back to meals")}
          </button>
        }
      />

      <div className="container addon-layout">
        <main className="addon-main">
          {/* ---------- Travel ---------- */}
          <section className="addon-card">
            <h2> <Car size={19} /> {tx("Local travel")} <span className="chip">{tx("Optional")}</span> </h2>
            <p className="addon-sub">{tx("Per vehicle, per day. Cabs, SUVs and buses come with a driver.")} {plural(tx, guests, "You have {n} guest.", "You have {n} guests.")}</p>

            <div className="mode-grid">
              <button type="button" className={`mode-card ${!transport ? "active" : ""}`} onClick={() => pickMode(null)}>
                <X size={22} />
                <strong>{tx("No travel")}</strong>
                <small>{tx("I will arrange my own")}</small>
              </button>

              {modes.map((mode) => {
                const Icon = MODE_ICONS[mode.id] || Car;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    className={`mode-card ${transport?.mode === mode.id ? "active" : ""}`}
                    onClick={() => pickMode(mode)}
                  >
                    <Icon size={24} />
                    <strong>{tx(mode.label)}</strong>
                    <small>{tx("Seats {n}", { n: mode.seats })}</small>
                    <em>{tx("from {price} / day", { price: formatMoney(mode.prices.nonAc ?? mode.prices.ac) })}</em>
                  </button>
                );
              })}
            </div>

            {currentMode && (
              <div className="mode-config">
                <p>{tx(currentMode.description)}</p>

                <div className="mode-config-row">
                  <div>
                    <label>{tx("Type")}</label>
                    <div className="segmented">
                      <button
                        type="button"
                        className={transport.ac ? "active" : ""}
                        disabled={!currentMode.prices.ac}
                        onClick={() => patchTransport({ ac: true })}
                      >
                        AC {currentMode.prices.ac ? `· ${formatMoney(currentMode.prices.ac)}` : tx("· not available")}
                      </button>
                      <button
                        type="button"
                        className={!transport.ac ? "active" : ""}
                        disabled={!currentMode.prices.nonAc}
                        onClick={() => patchTransport({ ac: false })}
                      > {tx("Non-AC")} {currentMode.prices.nonAc ? `· ${formatMoney(currentMode.prices.nonAc)}` : tx("· not available")} </button>
                    </div>
                  </div>

                  <div>
                    <label>{tx("Days")}</label>
                    <div className="stepper">
                      <button type="button" onClick={() => patchTransport({ days: Math.max(1, transport.days - 1) })} aria-label={tx("Fewer days")}>
                        <Minus size={15} />
                      </button>
                      <span>{transport.days}</span>
                      <button type="button" onClick={() => patchTransport({ days: Math.min(30, transport.days + 1) })} aria-label={tx("More days")}>
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label>{tx("Vehicles")}</label>
                    <div className="stepper">
                      <button
                        type="button"
                        onClick={() => patchTransport({ vehicles: Math.max(minVehicles, transport.vehicles - 1) })}
                        aria-label={tx("Fewer vehicles")}
                      >
                        <Minus size={15} />
                      </button>
                      <span>{transport.vehicles}</span>
                      <button type="button" onClick={() => patchTransport({ vehicles: Math.min(10, transport.vehicles + 1) })} aria-label={tx("More vehicles")}>
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mode-total"> {formatMoney(perDay)} × {plural(tx, transport.days, "{n} day", "{n} days")}{transport.vehicles > 1 ? ` × ${plural(tx, transport.vehicles, "{n} vehicle", "{n} vehicles")}` : ""} ={" "}
                  <strong>{formatMoney(perDay * transport.days * transport.vehicles)}</strong>
                </div>
              </div>
            )}
          </section>

          {/* ---------- Activities ---------- */}
          <section className="addon-card">
            <h2> <Ticket size={19} /> {tx("Additional activities")} <span className="chip">{tx("Optional")}</span> </h2>
            <p className="addon-sub">{tx("Prices are per person for your {n} guests, unless marked per group.", { n: guests })}</p>

            <h3 className="addon-subhead">{tx("Experiences you can add")}</h3>
            <ul className="activity-list">
              {options.experiences.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </ul>

            <h3 className="addon-subhead">{tx("Real places and attractions near your hotel")}</h3>
            <p className="addon-fine">
              {tx("These are real places from the map data. The fee shown is an indicative entry or guide fee, so confirm the exact price on the day.")}
            </p>

            {options.loading && <p className="addon-fine">{tx("Finding things to do...")}</p>}

            {!options.loading && options.nearby.length === 0 && (
              <p className="addon-fine">{tx("No nearby attractions were found in the map data.")}</p>
            )}

            <ul className="activity-list">
              {options.nearby.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </ul>
          </section>
        </main>

        <div className="addon-side">
          <TripPriceSummary trip={nextTrip}>
            <button type="button" className="btn btn-primary addon-continue" onClick={handleContinue}>
              {tx("Continue to trip preview")} <ArrowRight size={17} />
            </button>

            {!transport && activities.length === 0 && (
              <button type="button" className="addon-skip" onClick={handleContinue}>
                {tx("Skip travel & activities")}
              </button>
            )}
          </TripPriceSummary>
        </div>
      </div>
    </div>
  );
};

export default TravelActivities;
