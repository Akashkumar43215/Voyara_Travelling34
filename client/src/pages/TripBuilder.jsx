import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  Clock,
  Hotel,
  MapPin,
  Users,
} from "lucide-react";

import TripPriceSummary from "../components/TripPriceSummary";
import { TRANSPORT_LABELS, mealNames, stateForNext, tripFromState } from "../utils/trip";
import PageHero from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { plural } from "../i18n/plural";
import { dateLocale } from "../i18n/runtime";

const TripBuilder = () => {
  const { t: tx } = useLanguage();

  const location = useLocation();
  const navigate = useNavigate();

  const selectedLocation = location.state?.location || null;
  const selectedPlaces = location.state?.selectedPlaces || [];
  const selectedStay = location.state?.selectedStay || null;
  const selectedRoom = location.state?.selectedRoom || null;

  const checkIn = location.state?.checkIn || "";
  const checkOut = location.state?.checkOut || "";

  const rooms = Number(location.state?.rooms || 1);
  const adults = Number(location.state?.adults || 2);
  const children = Number(location.state?.children || 0);

  // Meals, local travel and activities chosen in the earlier steps
  const meals = location.state?.meals || { breakfast: false, lunch: false, dinner: false };
  const transport = location.state?.transport || null;
  const activities = location.state?.activities || [];

  // ======================================================
  // CALCULATE TRIP NIGHTS
  // ======================================================

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) {
      return 0;
    }

    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);

    const difference = end.getTime() - start.getTime();

    return Math.max(
      0,
      Math.round(difference / (1000 * 60 * 60 * 24))
    );
  }, [checkIn, checkOut]);

  // ======================================================
  // ROOM COST
  // ======================================================

  const roomTotal = useMemo(() => {
    if (!selectedRoom || nights <= 0) {
      return 0;
    }

    const pricePerNight = Number(
      selectedRoom.pricePerNight || 0
    );

    return pricePerNight * nights * rooms;
  }, [selectedRoom, nights, rooms]);

  // ======================================================
  // TRIP SUMMARY
  // ======================================================

  const tripSummary = useMemo(() => {
    return {
      destination:
        selectedLocation?.city ||
        selectedLocation?.name ||
        "Unknown",

      places: selectedPlaces.length,

      stay: selectedStay?.name || "Not selected",

      room: selectedRoom?.name || "Not selected",

      nights,

      rooms,

      guests: adults + children,
    };
  }, [
    selectedLocation,
    selectedPlaces,
    selectedStay,
    selectedRoom,
    nights,
    rooms,
    adults,
    children,
  ]);

  // ======================================================
  // CONTINUE TO BOOKING DETAILS
  // ======================================================

  const handleContinue = () => {
    if (!selectedLocation || !selectedStay || !selectedRoom) {
      return;
    }

    navigate("/booking-details", {
      state: {
        location: selectedLocation,
        selectedPlaces,
        selectedStay,
        selectedRoom,
        checkIn,
        checkOut,
        rooms,
        adults,
        children,
        nights,
        meals,
        transport,
        activities,
      },
    });
  };

  // The whole trip, for editing a step and for the live total
  const wholeTrip = tripFromState({ ...location.state, nights });
  const mealList = mealNames(meals);

  // ======================================================
  // MISSING DATA
  // ======================================================

  if (
    !selectedLocation ||
    !selectedStay ||
    !selectedRoom
  ) {
    return (
      <div className="real-places-empty">
        <MapPin size={44} />

        <h2>{tx("Trip information is incomplete")}</h2>

        <p>
          {tx("Please complete the destination, accommodation, dates, and room selection before building your trip.")}
        </p>

        <button
          className="btn btn-primary"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={17} />
          {tx("Back to Home")}
        </button>
      </div>
    );
  }

  return (
    <div className="trip-builder-page">
      <PageHero
        compact
        eyebrow={tx("STEP 6 OF 9 · TRIP PREVIEW")}
        icon={<MapPin />}
        title={tx("Build Your Trip")}
        subtitle={
          <> {tx("Review your destination, places, accommodation, dates, and guests before continuing.")} <br />
            <MapPin size={15} />{" "}
            {(selectedLocation.formatted ||
              [selectedLocation.city, selectedLocation.state, selectedLocation.country]
                .filter(Boolean)
                .join(", "))
              .split(", ")
              .map((part) => tx(part))
              .join(", ")}
          </>
        }
        actions={
          <button className="page-hero-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
            {tx("Back to Room Selection")}
          </button>
        }
      />

      <section className="section">
        <div className="container">

          {/* ==================================================
              TRIP OVERVIEW
          ================================================== */}

          <div className="trip-overview-grid">

            <div className="trip-overview-card">
              <MapPin size={21} />

              <div>
                <span>{tx("Destination")}</span>

                <strong>
                  {tripSummary.destination}
                </strong>
              </div>
            </div>

            <div className="trip-overview-card">
              <CalendarDays size={21} />

              <div>
                <span>{tx("Travel Dates")}</span>

                <strong>
                  {formatDisplayDate(checkIn)}
                  {" → "}
                  {formatDisplayDate(checkOut)}
                </strong>
              </div>
            </div>

            <div className="trip-overview-card">
              <Clock size={21} />

              <div>
                <span>{tx("Duration")}</span>

                <strong>
                  {nights}{" "}
                  {nights === 1 ? tx("Night") : tx("Nights")}
                </strong>
              </div>
            </div>

            <div className="trip-overview-card">
              <Users size={21} />

              <div>
                <span>{tx("Travellers")}</span>

                <strong>{plural(tx, adults, "{n} Adult", "{n} Adults")}{children > 0 ? " + " + plural(tx, children, "{n} Child", "{n} Children") : ""}</strong>
              </div>
            </div>

          </div>

          {/* ==================================================
              ITINERARY
          ================================================== */}

          <div className="trip-builder-section">

            <div className="trip-builder-heading">
              <div>
                <span className="section-tag">
                  {tx("YOUR ITINERARY")}
                </span>

                <h2>
                  {tx("Selected Tourist Places")}
                </h2>

                <p>{plural(tx, selectedPlaces.length, "{n} place selected for your trip.", "{n} places selected for your trip.")}</p>
              </div>
            </div>

            {selectedPlaces.length === 0 ? (
              <div className="trip-empty">
                <MapPin size={35} />

                <p>
                  {tx("No tourist places selected.")}
                </p>
              </div>
            ) : (
              <div className="trip-places-list">

                {selectedPlaces.map(
                  (place, index) => (
                    <div
                      className="trip-place-item"
                      key={
                        place.placeId ||
                        place.geoapifyPlaceId ||
                        `${place.name}-${index}`
                      }
                    >

                      <div className="trip-place-number">
                        {index + 1}
                      </div>

                      <div className="trip-place-icon">
                        <MapPin size={19} />
                      </div>

                      <div className="trip-place-info">

                        <h3>
                          {tx(place.name)}
                        </h3>

                        {place.address && (
                          <p>
                            {place.address}
                          </p>
                        )}

                        {place.distance != null && (
                          <span>{tx("{dist} from destination", { dist: formatDistance(place.distance) })}</span>
                        )}

                      </div>

                      <Check
                        size={20}
                        className="trip-place-check"
                      />

                    </div>
                  )
                )}

              </div>
            )}

          </div>

          {/* ==================================================
              ACCOMMODATION
          ================================================== */}

          <div className="trip-builder-section">

            <div className="trip-builder-heading">
              <div>
                <span className="section-tag">
                  {tx("ACCOMMODATION")}
                </span>

                <h2>
                  {tx(selectedStay.name)}
                </h2>

                <p>
                  {tx("Your selected accommodation.")}
                </p>
              </div>
            </div>

            <div className="trip-accommodation-card">

              <div className="trip-accommodation-icon">
                <Hotel size={32} />
              </div>

              <div className="trip-accommodation-info">

                <span>
                  {tx("Selected Stay")}
                </span>

                <h3>
                  {tx(selectedStay.name)}
                </h3>

                {selectedStay.address && (
                  <p>
                    {selectedStay.address}
                  </p>
                )}

              </div>

              <div className="trip-accommodation-status">
                <Check size={16} />
                {tx("Selected")}
              </div>

            </div>

          </div>

          {/* ==================================================
              ROOM
          ================================================== */}

          <div className="trip-builder-section">

            <div className="trip-builder-heading">
              <div>
                <span className="section-tag">
                  {tx("ROOM")}
                </span>

                <h2>
                  {tx(selectedRoom.name)}
                </h2>

                <p>{tx(children > 0 ? "{rooms} for {adults} adults and {children} children" : "{rooms} for {adults} adults", { rooms: plural(tx, rooms, "{n} room", "{n} rooms"), adults, children })}</p>
              </div>
            </div>

            <div className="trip-room-card">

              <div className="trip-room-icon">
                <BedDouble size={30} />
              </div>

              <div className="trip-room-info">

                <h3>
                  {tx(selectedRoom.name)}
                </h3>

                <div className="trip-room-details">

                  <span>{tx("Up to {n} guests", { n: selectedRoom.maxGuests || 0 })}</span>

                  {selectedRoom.availableRooms != null && (
                    <span>{tx("{n} rooms available", { n: selectedRoom.availableRooms })}</span>
                  )}

                  {selectedRoom.amenities?.length > 0 && (
                    <span>
                      {selectedRoom.amenities
                        .slice(0, 3)
                        .join(" • ")}
                    </span>
                  )}

                </div>

              </div>

              <div className="trip-room-price">

                <strong>
                  ₹
                  {Number(
                    selectedRoom.pricePerNight || 0
                  ).toLocaleString("en-IN")}
                </strong>

                <span>
                  {tx("/ night")}
                </span>

              </div>

            </div>

          </div>

          {/* ==================================================
              TRIP SUMMARY
          ================================================== */}

          {/* ==================================================
              MEALS, TRAVEL & ACTIVITIES
          ================================================== */}

          <div className="trip-builder-section">
            <div className="trip-builder-heading">
              <div>
                <span className="section-tag">{tx("EXTRAS")}</span>
                <h2>{tx("Meals, travel & activities")}</h2>
              </div>
            </div>

            <div className="trip-extras">
              <div className="trip-extra">
                <div>
                  <strong>{tx("Meals")}</strong>
                  <span>
                    {mealList.length
                      ? tx("{list} included", { list: mealList.join(", ") })
                      : tx("Food excluded (room only)")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/meals", { state: stateForNext(wholeTrip) })}
                >
                  {tx("Change")}
                </button>
              </div>

              <div className="trip-extra">
                <div>
                  <strong>{tx("Local travel")}</strong>
                  <span>
                    {transport
                      ? `${tx(TRANSPORT_LABELS[transport.mode] || transport.mode)} · ${transport.ac ? "AC" : tx("Non-AC")} · ${plural(tx, transport.days, "{n} day", "{n} days")} · ${plural(tx, transport.vehicles, "{n} vehicle", "{n} vehicles")}`
                      : tx("Not added")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/add-ons", { state: stateForNext(wholeTrip) })}
                >
                  {tx("Change")}
                </button>
              </div>

              <div className="trip-extra">
                <div>
                  <strong>{tx("Activities")}</strong>
                  <span>
                    {activities.length
                      ? activities.map((a) => a.name).join(", ")
                      : tx("None added")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/add-ons", { state: stateForNext(wholeTrip) })}
                >
                  {tx("Change")}
                </button>
              </div>
            </div>
          </div>

          {/* ==================================================
              TRIP TOTAL (calculated by the server)
          ================================================== */}

          <div className="trip-builder-total">
            <TripPriceSummary trip={wholeTrip} title={tx("Trip total")} />
          </div>

          {/* ==================================================
              CONTINUE
          ================================================== */}

          <div className="trip-builder-actions">

            <button
              className="btn btn-primary"
              onClick={handleContinue}
            >
              {tx("Continue to Trip Review")}
              <ArrowRight size={17} />
            </button>

          </div>

        </div>
      </section>
    </div>
  );
};

// ======================================================
// HELPERS
// ======================================================

const formatDisplayDate = (dateString) => {
  if (!dateString) {
    return "--";
  }

  const date = new Date(
    `${dateString}T00:00:00`
  );

  return date.toLocaleDateString(dateLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDistance = (distance) => {
  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }

  return `${(distance / 1000).toFixed(1)} km`;
};

export default TripBuilder;