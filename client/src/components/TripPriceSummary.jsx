import React, { useEffect } from "react";

import useTripQuote from "../hooks/useTripQuote";
import { formatMoney, mealNames } from "../utils/trip";
import { useLanguage } from "../context/LanguageContext";
import { plural } from "../i18n/plural";

/**
 * Live price of the trip, always calculated by the server (the same calculation
 * the booking itself uses), so what is shown here is what will be charged.
 *
 * Props: trip (see utils/trip.js), onQuote(quote | null), children (buttons).
 */
const TripPriceSummary = ({ trip, onQuote, title = "Price Summary", children }) => {
  const { t: tx } = useLanguage();

  const { quote, error, loading } = useTripQuote(trip);

  useEffect(() => {
    onQuote?.(quote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote]);

  const perNight = Number(trip.selectedRoom?.pricePerNight || 0);

  return (
    <aside className="trip-summary">
      <h2>{tx(title)}</h2>

      <div className="trip-summary-stay">
        <strong>{tx(trip.selectedStay?.name)}</strong>
        <span>{tx(trip.selectedRoom?.name)} · {plural(tx, trip.nights, "{n} night", "{n} nights")} · {plural(tx, trip.adults, "{n} adult", "{n} adults")}{trip.children ? ", " + plural(tx, trip.children, "{n} child", "{n} children") : ""} · {plural(tx, trip.rooms, "{n} room", "{n} rooms")}</span>
      </div>

      <div className={`trip-summary-lines ${loading ? "busy" : ""}`}>
        <div>
          <span>{tx("Room")} <small>{formatMoney(perNight)} × {trip.rooms} × {trip.nights}</small></span>
          <strong>{formatMoney(quote ? quote.roomTotal : perNight * trip.rooms * trip.nights)}</strong>
        </div>

        {quote?.mealsTotal > 0 && (
          <div>
            <span>{tx("Meals")} <small>{mealNames(trip.meals).join(", ")}</small></span>
            <strong>{formatMoney(quote.mealsTotal)}</strong>
          </div>
        )}

        {quote?.transport && (
          <div>
            <span>{tx("Local travel")} <small>{tx(quote.transport.label)}, {quote.transport.ac ? "AC" : tx("Non-AC")} × {plural(tx, quote.transport.days, "{n} day", "{n} days")}{quote.transport.vehicles > 1 ? ` × ${quote.transport.vehicles}` : ""}</small></span>
            <strong>{formatMoney(quote.transportTotal)}</strong>
          </div>
        )}

        {quote?.activities?.length > 0 && (
          <div>
            <span>{tx("Activities")} <small>{tx("{n} selected", { n: quote.activities.length })}</small></span>
            <strong>{formatMoney(quote.activitiesTotal)}</strong>
          </div>
        )}

        <div>
          <span>{tx("Taxes & fees")} <small>5%</small></span>
          <strong>{quote ? formatMoney(quote.taxes) : "..."}</strong>
        </div>
      </div>

      <div className="trip-summary-total">
        <span>{tx("Total")}</span>
        <strong key={quote ? quote.totalAmount : "pending"} className="price-pop">{quote ? formatMoney(quote.totalAmount) : "..."}</strong>
      </div>

      {error && <p className="trip-summary-error">{error}</p>}

      <p className="trip-summary-note">{tx("Calculated by VOYARA, so this is the amount you will be charged.")}</p>

      {children}
    </aside>
  );
};

export default TripPriceSummary;
