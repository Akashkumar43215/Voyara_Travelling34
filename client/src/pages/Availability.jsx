import React, {
  useEffect,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import PageHero from "../components/PageHero";

import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  MapPin,
  Users,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import {
  checkRoomAvailability,
} from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import { plural, placeLine } from "../i18n/plural";
import { dateLocale } from "../i18n/runtime";

const Availability = () => {
  const { t: tx } = useLanguage();

  const location = useLocation();
  const navigate = useNavigate();

  // ======================================================
  // TRIP DATA
  // ======================================================

  const selectedLocation =
    location.state?.location || null;

  const selectedPlaces =
    location.state?.selectedPlaces || [];

  const selectedStay =
    location.state?.selectedStay || null;

  const selectedRoomFromDates =
    location.state?.selectedRoom || null;

  const checkIn =
    location.state?.checkIn || "";

  const checkOut =
    location.state?.checkOut || "";

  const rooms =
    Number(location.state?.rooms) || 1;

  const adults =
    Number(location.state?.adults) || 2;

  const children =
    Number(location.state?.children) || 0;

  const nights =
    Number(location.state?.nights) || 0;

  // ======================================================
  // AVAILABILITY STATE
  // ======================================================

  const [availability, setAvailability] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ======================================================
  // CHECK AVAILABILITY
  // ======================================================

  const runAvailabilityCheck =
    async () => {
      if (!selectedRoomFromDates) {
        setLoading(false);

        setError(
          tx("No room was selected.")
        );

        return;
      }

      const roomId =
        selectedRoomFromDates._id;

      if (!roomId) {
        setLoading(false);

        setError(
          tx("Selected room ID is missing.")
        );

        return;
      }

      try {
        setLoading(true);
        setError("");
        setAvailability(null);

        const response =
          await checkRoomAvailability({
            roomId,
            checkIn,
            checkOut,
            rooms,
          });

        setAvailability(
          response
        );

        if (
          response.success &&
          response.available
        ) {
          setError("");
        }
      } catch (requestError) {
        console.error(
          "Availability Check Error:",
          requestError
        );

        const message =
          requestError?.response?.data
            ?.message ||
          tx("Unable to check room availability.");

        setError(message);
        setAvailability(null);
      } finally {
        setLoading(false);
      }
    };

  // ======================================================
  // RUN WHEN PAGE OPENS
  // ======================================================

  useEffect(() => {
    runAvailabilityCheck();
  }, []);

  // ======================================================
  // CONTINUE
  // ======================================================

  const handleContinue =
    () => {
      if (
        !selectedRoomFromDates ||
        !availability?.available
      ) {
        return;
      }

      navigate(
        "/meals",
        {
          state: {
            location:
              selectedLocation,

            selectedPlaces,

            selectedStay,

            selectedRoom:
              selectedRoomFromDates,

            checkIn,

            checkOut,

            rooms,

            adults,

            children,

            nights,

            availability,
          },
        }
      );
    };

  // ======================================================
  // MISSING DATA
  // ======================================================

  if (
    !selectedLocation ||
    !selectedStay ||
    !selectedRoomFromDates
  ) {
    return (
      <div className="real-places-empty">
        <BedDouble size={44} />

        <h2>
          {tx("Booking details are missing")}
        </h2>

        <p>
          {tx("Please select a destination, accommodation, room, dates, and guests first.")}
        </p>

        <button
          className="btn btn-primary"
          onClick={() =>
            navigate("/")
          }
        >
          <ArrowLeft size={17} />
          {tx("Back to Home")}
        </button>
      </div>
    );
  }

  // ======================================================
  // AVAILABILITY VALUES
  // ======================================================

  const isAvailable =
    availability?.available === true;

  const availableRooms =
    availability?.data
      ?.availableRooms ?? 0;

  const totalRooms =
    availability?.data
      ?.totalRooms ??
    selectedRoomFromDates.totalRooms ??
    0;

  const bookedRooms =
    availability?.data
      ?.bookedRooms ?? 0;

  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <div className="availability-page">
      <section className="section">
        <div className="container">

          {/* BACK */}

          <button
            className="real-places-back"
            onClick={() =>
              navigate(-1)
            }
          >
            <ArrowLeft size={17} />
            {tx("Back to Trip Details")}
          </button>

          {/* HEADER */}

          <div className="section-header">
            <div>
              <span className="section-tag">
                {tx("STEP 3 OF 9 • ROOM AVAILABILITY")}
              </span>

              <h1 className="section-title">
                {tx("Check Room Availability")}
              </h1>

              <p className="section-desc">
                {tx("We are checking the selected room against current VOYARA booking records.")}
              </p>
            </div>

            <div className="real-location-badge">
              <MapPin size={16} />

              {placeLine(tx, selectedLocation.formatted ||
                [
                  selectedLocation.city,
                  selectedLocation.state,
                  selectedLocation.country,
                ]
                  .filter(Boolean)
                  .join(", "))}
            </div>
          </div>

          {/* BOOKING SUMMARY */}

          <div className="availability-summary">

            <div className="availability-summary-item">
              <CalendarDays size={19} />

              <div>
                <span>
                  {tx("Dates")}
                </span>

                <strong>
                  {formatDisplayDate(
                    checkIn
                  )}

                  {" → "}

                  {formatDisplayDate(
                    checkOut
                  )}
                </strong>
              </div>
            </div>

            <div className="availability-summary-item">
              <Users size={19} />

              <div>
                <span>
                  {tx("Guests")}
                </span>

                <strong>{plural(tx, adults, "{n} Adult", "{n} Adults")}{children > 0 ? ", " + plural(tx, children, "{n} Child", "{n} Children") : ""}</strong>
              </div>
            </div>

            <div className="availability-summary-item">
              <BedDouble size={19} />

              <div>
                <span>
                  {tx("Rooms")}
                </span>

                <strong>
                  {rooms}
                </strong>
              </div>
            </div>

          </div>

          {/* SELECTED STAY */}

          <div className="availability-stay-card">

            <div className="availability-stay-icon">
              <BedDouble size={28} />
            </div>

            <div>
              <span>
                {tx("Selected Accommodation")}
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

          </div>

          {/* SELECTED ROOM */}

          <div className="availability-room-card">

            <div className="availability-room-header">

              <div>
                <span>
                  {tx("Selected Room")}
                </span>

                <h2>
                  {tx(selectedRoomFromDates.name)}
                </h2>

                {selectedRoomFromDates.description && (
                  <p>
                    {
                      tx(selectedRoomFromDates.description)
                    }
                  </p>
                )}
              </div>

              <div className="availability-room-price">
                <strong>
                  ₹
                  {Number(
                    selectedRoomFromDates.pricePerNight
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>

                <span>
                  {tx("/ night")}
                </span>
              </div>

            </div>

            <div className="availability-room-details">

              <span> <Users size={15} /> {tx("Max {n} guests", { n: selectedRoomFromDates.maxGuests })} </span>

              <span>{tx("{n} total rooms", { n: selectedRoomFromDates.totalRooms || totalRooms })}</span>

              {selectedRoomFromDates.amenities?.length >
                0 && (
                <span>
                  ✓{" "}
                  {
                    selectedRoomFromDates
                      .amenities[0]
                  }
                </span>
              )}

            </div>

          </div>

          {/* LOADING */}

          {loading && (
            <div className="availability-status-card loading">

              <RefreshCw
                size={30}
                className="availability-spin"
              />

              <h2>
                {tx("Checking availability...")}
              </h2>

              <p>{tx("Checking {name} for your selected dates.", { name: selectedRoomFromDates.name })}</p>

            </div>
          )}

          {/* ERROR */}

          {!loading && error && (
            <div className="availability-status-card error">

              <AlertCircle size={32} />

              <h2>
                {tx("Availability Check Failed")}
              </h2>

              <p>
                {error}
              </p>

              <button
                className="btn btn-primary"
                onClick={
                  runAvailabilityCheck
                }
              >
                <RefreshCw
                  size={17}
                />
                {tx("Try Again")}
              </button>

            </div>
          )}

          {/* AVAILABLE */}

          {!loading &&
            !error &&
            isAvailable && (
              <div className="availability-status-card success">

                <div className="availability-success-icon">
                  <Check size={32} />
                </div>

                <h2>
                  {tx("Room Available")}
                </h2>

                <p>{tx("Great! {name} is available for your selected dates.", { name: selectedRoomFromDates.name })}</p>

                <div className="availability-inventory">

                  <div>
                    <span>
                      {tx("Total Rooms")}
                    </span>

                    <strong>
                      {totalRooms}
                    </strong>
                  </div>

                  <div>
                    <span>
                      {tx("Already Booked")}
                    </span>

                    <strong>
                      {bookedRooms}
                    </strong>
                  </div>

                  <div>
                    <span>
                      {tx("Available")}
                    </span>

                    <strong>
                      {availableRooms}
                    </strong>
                  </div>

                  <div>
                    <span>
                      {tx("You Need")}
                    </span>

                    <strong>
                      {rooms}
                    </strong>
                  </div>

                </div>

              </div>
            )}

          {/* NOT AVAILABLE */}

          {!loading &&
            !error &&
            availability &&
            !isAvailable && (
              <div className="availability-status-card unavailable">

                <div className="availability-error-icon">
                  <AlertCircle
                    size={32}
                  />
                </div>

                <h2>
                  {tx("Room Not Available")}
                </h2>

                <p>
                  {availability.message ||
                    tx("Only {n} room(s) are available for your selected dates.", { n: availableRooms })}
                </p>

                <div className="availability-inventory">

                  <div>
                    <span>
                      {tx("Total Rooms")}
                    </span>

                    <strong>
                      {totalRooms}
                    </strong>
                  </div>

                  <div>
                    <span>
                      {tx("Already Booked")}
                    </span>

                    <strong>
                      {bookedRooms}
                    </strong>
                  </div>

                  <div>
                    <span>
                      {tx("Available")}
                    </span>

                    <strong>
                      {availableRooms}
                    </strong>
                  </div>

                  <div>
                    <span>
                      {tx("You Need")}
                    </span>

                    <strong>
                      {rooms}
                    </strong>
                  </div>

                </div>

                <button
                  className="btn btn-primary"
                  onClick={() =>
                    navigate(-1)
                  }
                >
                  <ArrowLeft
                    size={17}
                  />
                  {tx("Change Room or Dates")}
                </button>

              </div>
            )}

        </div>
      </section>

      {/* CONTINUE BAR */}

      {!loading &&
        !error &&
        isAvailable && (
          <div className="availability-selection-bar">

            <div className="container">

              <div>
                <strong>
                  {
                    tx(selectedRoomFromDates.name)
                  }
                </strong>

                <span>₹{Number(selectedRoomFromDates.pricePerNight).toLocaleString("en-IN")} {tx("/ night")}</span>
              </div>

              <button
                className="btn btn-primary"
                onClick={
                  handleContinue
                }
              >
                {tx("Continue to Meals & Facilities")}
                <ArrowRight
                  size={17}
                />
              </button>

            </div>

          </div>
        )}

    </div>
  );
};

// ======================================================
// DATE FORMATTER
// ======================================================

const formatDisplayDate = (
  dateString
) => {
  if (!dateString) {
    return "--";
  }

  const date = new Date(
    `${dateString}T00:00:00`
  );

  return date.toLocaleDateString(dateLocale(),
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};

export default Availability;