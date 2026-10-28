import React from "react";
import { BedDouble, MapPin, X } from "lucide-react";

import { cityOf } from "../utils/tripCart";
import { dateLocale } from "../i18n/runtime";

const show = (dateString) =>
  dateString ? new Date(`${dateString}T00:00:00`).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" }) : "--";

/**
 * The saved stops of a multi-city trip, in date order.
 * `onRemove` makes each stop removable; `children(leg)` adds extra content to a stop (its price, its status).
 */
const TripLegs = ({ legs, onRemove, children }) => (
  <ol className="legs">
    {legs.map((leg, index) => (
      <li key={leg.key} className="leg">
        <span className="leg-number">{index + 1}</span>

        <div className="leg-body">
          <strong>
            <MapPin size={14} /> {cityOf(leg)}
          </strong>
          <span>
            <BedDouble size={13} /> {leg.selectedStay?.name} · {leg.selectedRoom?.name}
          </span>
          <small>
            {show(leg.checkIn)} → {show(leg.checkOut)} · {leg.nights} {leg.nights === 1 ? "night" : "nights"}
          </small>
        </div>

        {children?.(leg)}

        {onRemove && (
          <button type="button" className="leg-remove" onClick={() => onRemove(leg.key)} aria-label={`Remove ${cityOf(leg)} from the trip`}>
            <X size={15} />
          </button>
        )}
      </li>
    ))}
  </ol>
);

export default TripLegs;
