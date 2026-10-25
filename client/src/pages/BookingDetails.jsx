import { useMemo, useState } from "react";
import useTripQuote from "../hooks/useTripQuote";
import { formatMoney, mealNames, tripFromState } from "../utils/trip";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Hotel,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
} from "lucide-react";
import PageHero from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { plural, placeLine } from "../i18n/plural";
import { dateLocale } from "../i18n/runtime";

const BookingDetails = () => {
  const { t: tx } = useLanguage();

  const location = useLocation();
  const navigate = useNavigate();

  const {
    location: selectedLocation,
    selectedPlaces = [],
    selectedStay,
    selectedRoom,
    checkIn,
    checkOut,
    rooms = 1,
    adults = 2,
    children = 0,
    nights = 0,
  } = location.state || {};

  const [traveler, setTraveler] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [error, setError] = useState("");

  // ======================================================
  // CALCULATE NIGHTS
  // ======================================================

  const calculatedNights = useMemo(() => {
    if (nights > 0) {
      return Number(nights);
    }

    if (!checkIn || !checkOut) {
      return 0;
    }

    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);

    const difference =
      end.getTime() - start.getTime();

    return Math.max(
      0,
      Math.round(
        difference / (1000 * 60 * 60 * 24)
      )
    );
  }, [checkIn, checkOut, nights]);

  // ======================================================
  // ROOM PRICE
  // ======================================================

  const pricePerNight = Number(
    selectedRoom?.pricePerNight || 0
  );

  const roomTotal = useMemo(() => {
    return (
      pricePerNight *
      Number(rooms) *
      calculatedNights
    );
  }, [
    pricePerNight,
    rooms,
    calculatedNights,
  ]);

  // ======================================================
  // TAX
  // ======================================================

  const taxes = useMemo(() => {
    return Math.round(roomTotal * 0.05);
  }, [roomTotal]);

  const totalAmount = roomTotal + taxes;

  // Meals, travel and activities chosen earlier, and the server's price for all of it
  const meals = location.state?.meals;
  const transport = location.state?.transport;
  const activities = location.state?.activities;

  const wholeTrip = tripFromState({ ...location.state, nights: calculatedNights });
  const { quote } = useTripQuote(wholeTrip);
  const shown = quote || { roomTotal, taxes, totalAmount, mealsTotal: 0, transportTotal: 0, activitiesTotal: 0 };

  // ======================================================
  // REQUIRED TRIP DATA
  // ======================================================

  const hasTripData =
    selectedLocation &&
    selectedStay &&
    selectedRoom &&
    checkIn &&
    checkOut &&
    calculatedNights > 0;

  // ======================================================
  // HANDLE INPUT
  // ======================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setTraveler((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  // ======================================================
  // VALIDATE FORM
  // ======================================================

  const validateForm = () => {
    const name = traveler.name.trim();
    const email = traveler.email.trim();
    const phone = traveler.phone.trim();

    if (!name || !email || !phone) {
      return tx("Please provide your name, email and phone number.");
    }

    if (name.length < 2) {
      return tx("Please enter a valid traveler name.");
    }

    const emailRegex = /^\S+@\S+\.\S+$/;

    if (!emailRegex.test(email)) {
      return tx("Please enter a valid email address.");
    }

    const phoneDigits = phone.replace(/\D/g, "");

    if (phoneDigits.length < 10) {
      return tx("Please enter a valid phone number.");
    }

    return "";
  };

  // ======================================================
  // CONTINUE
  // ======================================================

  const handleContinue = (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");

    navigate("/trip-review", {
      state: {
        location: selectedLocation,
        selectedPlaces,
        selectedStay,
        selectedRoom,
        checkIn,
        checkOut,
        rooms: Number(rooms),
        adults: Number(adults),
        children: Number(children),
        nights: calculatedNights,
        meals,
        transport,
        activities,
        traveler: {
          name: traveler.name.trim(),
          email: traveler.email.trim().toLowerCase(),
          phone: traveler.phone.trim(),
        },
      },
    });
  };

  // ======================================================
  // BACK TO TRIP BUILDER
  // ======================================================

  const handleBack = () => {
    navigate("/trip-builder", {
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
        nights: calculatedNights,
        meals,
        transport,
        activities,
      },
    });
  };

  // ======================================================
  // MISSING DATA
  // ======================================================

  if (!hasTripData) {
    return (
      <div className="booking-details-page">
        <div className="container">

          <div className="booking-details-empty">

            <MapPin size={42} />

            <h2>
              {tx("Booking information is missing")}
            </h2>

            <p>
              {tx("Please return to the trip builder and complete your trip before continuing.")}
            </p>

            <button
              className="btn btn-primary"
              onClick={() =>
                navigate("/trip-builder")
              }
            >
              <ArrowLeft size={17} />
              {tx("Return to Trip Builder")}
            </button>

          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="booking-details-page">

      <PageHero
        compact
        eyebrow={tx("STEP 7 OF 9 · TRAVELER DETAILS")}
        icon={<Hotel />}
        title={tx("Traveler & Booking Details")}
        subtitle={tx("Enter the primary traveler information for your VOYARA booking.")}
        actions={
          <button
            className="page-hero-btn"
            onClick={handleBack}
          >
            <ArrowLeft size={17} />
            {tx("Back")}
          </button>
        }
      />

      <div className="container page-body">

        {/* ==================================================
            MAIN LAYOUT
        ================================================== */}

        <div className="booking-details-layout">

          {/* ==================================================
              TRAVELER FORM
          ================================================== */}

          <div className="booking-form-card">

            <div className="booking-form-heading">

              <User size={20} />

              <div>

                <h2>
                  {tx("Primary Traveler")}
                </h2>

                <p>
                  {tx("This information will be used for booking communication.")}
                </p>

              </div>

            </div>

            {/* ERROR */}

            {error && (
              <div className="booking-form-error">
                {error}
              </div>
            )}

            <form
              onSubmit={handleContinue}
              className="booking-form"
            >

              {/* NAME */}

              <div className="booking-field">

                <label htmlFor="traveler-name">
                  {tx("Full Name")}
                </label>

                <div className="booking-input">

                  <User size={18} />

                  <input
                    id="traveler-name"
                    type="text"
                    name="name"
                    placeholder={tx("Enter full name")}
                    value={traveler.name}
                    onChange={handleChange}
                    autoComplete="name"
                  />

                </div>

              </div>

              {/* EMAIL */}

              <div className="booking-field">

                <label htmlFor="traveler-email">
                  {tx("Email Address")}
                </label>

                <div className="booking-input">

                  <Mail size={18} />

                  <input
                    id="traveler-email"
                    type="email"
                    name="email"
                    placeholder={tx("Enter email address")}
                    value={traveler.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />

                </div>

              </div>

              {/* PHONE */}

              <div className="booking-field">

                <label htmlFor="traveler-phone">
                  {tx("Phone Number")}
                </label>

                <div className="booking-input">

                  <Phone size={18} />

                  <input
                    id="traveler-phone"
                    type="tel"
                    name="phone"
                    placeholder={tx("Enter phone number")}
                    value={traveler.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                    inputMode="tel"
                  />

                </div>

              </div>

              {/* CONTINUE */}

              <button
                type="submit"
                className="booking-continue-btn"
              >
                {tx("Continue to Trip Review")}
                <ArrowRight size={18} />
              </button>

            </form>

          </div>

          {/* ==================================================
              TRIP SUMMARY
          ================================================== */}

          <aside className="booking-summary-card">

            <h2>
              {tx("Trip Summary")}
            </h2>

            {/* DESTINATION */}

            <div className="booking-summary-destination">

              <strong>
                {tx(selectedLocation.name ||
                  selectedLocation.city ||
                  tx("Selected Destination"))}
              </strong>

              <span>
                {placeLine(tx, [
                  selectedLocation.city,
                  selectedLocation.state,
                ]
                  .filter(Boolean)
                  .join(", "))}
              </span>

            </div>

            {/* TRAVELERS */}

            <div className="booking-summary-row">

              <Users size={17} />

              <span>{plural(tx, adults, "{n} Adult", "{n} Adults")} · {plural(tx, children, "{n} Child", "{n} Children")}</span>

            </div>

            {/* ROOMS */}

            <div className="booking-summary-row">

              <span>
                {rooms}{" "}
                {Number(rooms) === 1
                  ? tx("Room")
                  : tx("Rooms")}
              </span>

            </div>

            {/* DATES */}

            <div className="booking-summary-row">

              <CalendarDays size={17} />

              <span>
                {formatDisplayDate(checkIn)}
                {" → "}
                {formatDisplayDate(checkOut)}
              </span>

            </div>

            {/* DURATION */}

            <div className="booking-summary-row">

              <Clock size={17} />

              <span>
                {calculatedNights}{" "}
                {calculatedNights === 1
                  ? tx("Night")
                  : tx("Nights")}
              </span>

            </div>

            {/* STAY */}

            <div className="booking-summary-section">

              <span>
                {tx("Stay")}
              </span>

              <strong>
                {tx(selectedStay.name)}
              </strong>

            </div>

            {/* ROOM */}

            <div className="booking-summary-section">

              <span>
                {tx("Room")}
              </span>

              <strong>
                {tx(selectedRoom.name)}
              </strong>

            </div>

            {/* PLACES */}

            <div className="booking-summary-section">

              <span>
                {tx("Places")}
              </span>

              <strong>{tx("{n} selected", { n: selectedPlaces.length })}</strong>

            </div>

            {/* PRICE */}

            <div className="booking-summary-pricing">
              <div>
                <span>{tx("Room Cost")}</span>
                <strong>{formatMoney(shown.roomTotal)}</strong>
              </div>
              {shown.mealsTotal > 0 && (
                <div>
                  <span>{tx("Meals ({list})", { list: mealNames(meals).join(", ") })}</span>
                  <strong>{formatMoney(shown.mealsTotal)}</strong>
                </div>
              )}
              {shown.transportTotal > 0 && (
                <div>
                  <span>{tx("Local travel")}</span>
                  <strong>{formatMoney(shown.transportTotal)}</strong>
                </div>
              )}
              {shown.activitiesTotal > 0 && (
                <div>
                  <span>{tx("Activities")}</span>
                  <strong>{formatMoney(shown.activitiesTotal)}</strong>
                </div>
              )}
              <div>
                <span>{tx("Taxes")}</span>
                <strong>{formatMoney(shown.taxes)}</strong>
              </div>
              <div className="booking-summary-total">
                <span>{tx("Total")}</span>
                <strong>{formatMoney(shown.totalAmount)}</strong>
              </div>
            </div>

            {/* READY */}

            <div className="booking-summary-ready">

              <Check size={17} />

              <span>
                {tx("Booking details ready")}
              </span>

            </div>

          </aside>

        </div>

      </div>

    </div>
  );
};

// ======================================================
// DATE FORMATTER
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

export default BookingDetails;