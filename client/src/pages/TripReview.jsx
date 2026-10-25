import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useTripQuote from "../hooks/useTripQuote";
import { formatMoney, mealNames, tripFromState } from "../utils/trip";
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  Check,
  Hotel,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
} from "lucide-react";
import { createBooking } from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageHero from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { plural } from "../i18n/plural";
import { dateLocale } from "../i18n/runtime";

const TripReview = () => {
  const { t: tx } = useLanguage();

  const location = useLocation();
  const navigate = useNavigate();

  const {
    isAuthenticated,
    loading: authLoading,
  } = useAuth();

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
    traveler,
    meals,
    transport,
    activities = [],
  } = location.state || {};

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ======================================================
  // PRICING
  // ======================================================

  const { quote } = useTripQuote(tripFromState({ ...location.state, nights }));

  const pricing = useMemo(() => {
    const pricePerNight = Number(selectedRoom?.pricePerNight || 0);
    const roomTotal = quote ? quote.roomTotal : pricePerNight * Number(rooms) * Number(nights);
    const taxes = quote ? quote.taxes : Math.round(roomTotal * 0.05);

    return {
      pricePerNight,
      roomTotal,
      mealsTotal: quote?.mealsTotal || 0,
      transportTotal: quote?.transportTotal || 0,
      activitiesTotal: quote?.activitiesTotal || 0,
      taxes,
      totalAmount: quote ? quote.totalAmount : roomTotal + taxes,
    };
  }, [quote, selectedRoom, rooms, nights]);

  // ======================================================
  // VALIDATE TRIP DATA
  // ======================================================

  const hasTripData =
    selectedLocation &&
    selectedStay &&
    selectedRoom &&
    checkIn &&
    checkOut &&
    Number(nights) > 0 &&
    traveler?.name &&
    traveler?.email &&
    traveler?.phone;

  // ======================================================
  // CREATE BOOKING
  // ======================================================

  const handleConfirmBooking = async () => {
    setError("");

    // ----------------------------------------------------
    // AUTHENTICATION CHECK
    // ----------------------------------------------------

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: "/trip-review",
          bookingData: location.state,
        },
      });

      return;
    }

    // ----------------------------------------------------
    // DATA CHECK
    // ----------------------------------------------------

    if (!hasTripData) {
      setError(
        tx("Some booking information is missing. Please review your trip details.")
      );

      return;
    }

    try {
      setSubmitting(true);

      // --------------------------------------------------
      // PREPARE BOOKING PAYLOAD
      // --------------------------------------------------

      const bookingData = {
        destination: {
          name:
            selectedLocation.name ||
            selectedLocation.city ||
            "Unknown Destination",

          city:
            selectedLocation.city || "",

          state:
            selectedLocation.state || "",

          country:
            selectedLocation.country || "India",

          latitude:
            selectedLocation.lat ??
            selectedLocation.latitude ??
            null,

          longitude:
            selectedLocation.lon ??
            selectedLocation.longitude ??
            null,
        },

        selectedPlaces: selectedPlaces.map(
          (place) => ({
            placeId:
              place.placeId ||
              place.id ||
              place.geoapifyPlaceId ||
              "",

            name:
              place.name ||
              "Tourist Place",

            city:
              place.city || "",

            state:
              place.state || "",
          })
        ),

        traveler: {
          name: traveler.name.trim(),

          email:
            traveler.email
              .trim()
              .toLowerCase(),

          phone:
            traveler.phone.trim(),
        },

        accommodation: {
          placeId:
            selectedStay.geoapifyPlaceId ||
            selectedStay.placeId ||
            selectedStay.id ||
            "",

          name:
            selectedStay.name || "",

          address:
            selectedStay.address || "",

          city:
            selectedStay.city || "",

          state:
            selectedStay.state || "",
        },

        room: {
          id:
            selectedRoom._id ||
            selectedRoom.id ||
            "",

          name:
            selectedRoom.name || "",

          guests: Number(
            selectedRoom.maxGuests || 1
          ),

          pricePerNight: Number(
            selectedRoom.pricePerNight || 0
          ),
        },

        checkIn,

        checkOut,

        rooms: Number(rooms),

        adults: Number(adults),

        children: Number(children),
        nights: Number(nights),

        // choices only; the server prices them
        meals,
        transport: transport
          ? { mode: transport.mode, ac: transport.ac, vehicles: transport.vehicles, days: transport.days }
          : null,
        activities: activities.map((a) => ({ id: a.id, name: a.name })),
      };

      // --------------------------------------------------
      // CREATE BOOKING THROUGH BACKEND
      // --------------------------------------------------

      const response =
        await createBooking(bookingData);

      if (!response?.success) {
        throw new Error(
          response?.message ||
            tx("Unable to create booking.")
        );
      }

      // --------------------------------------------------
      // GO TO PAYMENT
      // --------------------------------------------------

      navigate("/payment", {
        state: {
          booking: response.data,
        },
      });
    } catch (error) {
      console.error(
        "Booking creation error:",
        error
      );

      setError(
        error.response?.data?.message ||
          error.message ||
          tx("Failed to create booking. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ======================================================
  // AUTH LOADING
  // ======================================================

  if (authLoading) {
    return (
      <div className="trip-review-page">
        <div className="container">

          <div className="trip-review-loading">

            <Loader2
              size={32}
              className="spin"
            />

            <p>
              {tx("Checking your account...")}
            </p>

          </div>

        </div>
      </div>
    );
  }

  // ======================================================
  // MISSING DATA
  // ======================================================

  if (!hasTripData) {
    return (
      <div className="trip-review-page">

        <div className="container">

          <div className="trip-review-empty">

            <MapPin size={42} />

            <h2>
              {tx("Trip information is incomplete")}
            </h2>

            <p>
              {tx("Please return to the trip builder and complete your booking details.")}
            </p>

            <button
              className="btn btn-primary"
              onClick={() =>
                navigate("/trip-builder")
              }
            >
              <ArrowLeft size={17} />
              {tx("Back to Trip Builder")}
            </button>

          </div>

        </div>

      </div>
    );
  }

  // ======================================================
  // PAGE
  // ======================================================

  return (
    <div className="trip-review-page">

      <PageHero
        compact
        eyebrow={tx("STEP 8 OF 9 · REVIEW BOOKING")}
        icon={<Hotel />}
        title={tx("Review Your Booking")}
        subtitle={tx("Check all your trip details before confirming the booking.")}
        actions={
          <button
            className="page-hero-btn"
            onClick={() =>
              navigate(
                "/booking-details",
                {
                  state: location.state,
                }
              )
            }
          >
            <ArrowLeft size={17} />
            {tx("Edit Details")}
          </button>
        }
      />

      <div className="container page-body">

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="trip-review-error">
            {error}
          </div>
        )}

        {/* ==================================================
            MAIN GRID
        ================================================== */}

        <div className="trip-review-grid">

          {/* ==================================================
              LEFT SIDE
          ================================================== */}

          <div className="trip-review-main">

            {/* ==================================================
                TRAVELER
            ================================================== */}

            <section className="review-card">

              <div className="review-card-heading">

                <div className="review-icon">
                  <User size={20} />
                </div>

                <div>

                  <h2>
                    {tx("Traveler Information")}
                  </h2>

                  <p>
                    {tx("Primary traveler for this booking")}
                  </p>

                </div>

              </div>

              <div className="review-traveler-grid">

                <div>

                  <span>
                    <User size={15} />
                    {tx("Name")}
                  </span>

                  <strong>
                    {traveler.name}
                  </strong>

                </div>

                <div>

                  <span>
                    <Mail size={15} />
                    {tx("Email")}
                  </span>

                  <strong>
                    {traveler.email}
                  </strong>

                </div>

                <div>

                  <span>
                    <Phone size={15} />
                    {tx("Phone")}
                  </span>

                  <strong>
                    {traveler.phone}
                  </strong>

                </div>

              </div>

            </section>

            {/* ==================================================
                DESTINATION
            ================================================== */}

            <section className="review-card">

              <div className="review-card-heading">

                <div className="review-icon">
                  <MapPin size={20} />
                </div>

                <div>

                  <h2>
                    {tx("Destination")}
                  </h2>

                  <p>
                    {tx("Your selected travel destination")}
                  </p>

                </div>

              </div>

              <div className="review-destination">

                <h3>
                  {selectedLocation.name ||
                    selectedLocation.city}
                </h3>

                <p>
                  {[
                    selectedLocation.city,
                    selectedLocation.state,
                    selectedLocation.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>

              </div>

            </section>

            {/* ==================================================
                TOURIST PLACES
            ================================================== */}

            <section className="review-card">

              <div className="review-card-heading">

                <div className="review-icon">
                  <MapPin size={20} />
                </div>

                <div>

                  <h2>
                    {tx("Selected Tourist Places")}
                  </h2>

                  <p>{plural(tx, selectedPlaces.length, "{n} place selected", "{n} places selected")}</p>

                </div>

              </div>

              <div className="review-places-list">

                {selectedPlaces.map(
                  (place, index) => (
                    <div
                      className="review-place"
                      key={
                        place.placeId ||
                        place.id ||
                        place.geoapifyPlaceId ||
                        `${place.name}-${index}`
                      }
                    >

                      <div className="review-place-number">
                        {index + 1}
                      </div>

                      <div>

                        <strong>
                          {tx(place.name)}
                        </strong>

                        {place.address && (
                          <span>
                            {place.address}
                          </span>
                        )}

                      </div>

                      <Check size={18} />

                    </div>
                  )
                )}

              </div>

            </section>

            {/* ==================================================
                ACCOMMODATION
            ================================================== */}

            <section className="review-card">

              <div className="review-card-heading">

                <div className="review-icon">
                  <Hotel size={20} />
                </div>

                <div>

                  <h2>
                    {tx("Accommodation")}
                  </h2>

                  <p>
                    {tx("Your selected stay")}
                  </p>

                </div>

              </div>

              <div className="review-stay">

                <div className="review-stay-icon">
                  <Hotel size={28} />
                </div>

                <div>

                  <h3>
                    {tx(selectedStay.name)}
                  </h3>

                  {selectedStay.address && (
                    <p>
                      {selectedStay.address}
                    </p>
                  )}

                  {selectedStay.city && (
                    <span>
                      {[
                        selectedStay.city,
                        selectedStay.state,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}

                </div>

              </div>

            </section>

            {/* ==================================================
                ROOM + DATES
            ================================================== */}

            <section className="review-card">

              <div className="review-card-heading">

                <div className="review-icon">
                  <BedDouble size={20} />
                </div>

                <div>

                  <h2>
                    {tx("Stay Details")}
                  </h2>

                  <p>
                    {tx("Room and travel dates")}
                  </p>

                </div>

              </div>

              <div className="review-details-grid">

                <div>

                  <span>
                    <BedDouble size={15} />
                    {tx("Room")}
                  </span>

                  <strong>
                    {tx(selectedRoom.name)}
                  </strong>

                </div>

                <div>

                  <span>
                    <CalendarDays size={15} />
                    {tx("Dates")}
                  </span>

                  <strong>
                    {formatDisplayDate(checkIn)}
                    {" → "}
                    {formatDisplayDate(checkOut)}
                  </strong>

                </div>

                <div>

                  <span>
                    <Users size={15} />
                    {tx("Guests")}
                  </span>

                  <strong>{plural(tx, adults, "{n} Adult", "{n} Adults")}{children > 0 ? " + " + plural(tx, children, "{n} Child", "{n} Children") : ""}</strong>

                </div>

                <div>

                  <span>
                    {tx("Nights")}
                  </span>

                  <strong>
                    {nights}{" "}
                    {nights === 1
                      ? tx("Night")
                      : tx("Nights")}
                  </strong>

                </div>

                <div>

                  <span>
                    {tx("Rooms")}
                  </span>

                  <strong>
                    {rooms}{" "}
                    {rooms === 1
                      ? tx("Room")
                      : tx("Rooms")}
                  </strong>

                </div>

                <div>

                  <span>
                    {tx("Room Capacity")}
                  </span>

                  <strong>{tx("Up to {n} guests", { n: selectedRoom.maxGuests || 1 })}</strong>

                </div>

              </div>

            </section>

          
              {/* ==================================================
                  MEALS, TRAVEL & ACTIVITIES
              ================================================== */}

              <section className="review-card">
                <div className="review-card-heading">
                  <div className="review-icon">
                    <Check size={20} />
                  </div>
                  <div>
                    <h2>{tx("Meals, travel & activities")}</h2>
                    <p>{tx("What you added to this stay")}</p>
                  </div>
                </div>

                <div className="review-extras">
                  <div>
                    <span>{tx("Meals")}</span>
                    <strong>
                      {mealNames(meals).length ? tx("{list} included", { list: mealNames(meals).join(", ") }) : tx("Food excluded (room only)")}
                    </strong>
                  </div>

                  <div>
                    <span>{tx("Local travel")}</span>
                    <strong>
                      {transport
                        ? `${quote?.transport?.label || transport.mode}, ${transport.ac ? "AC" : tx("Non-AC")} · ${plural(tx, transport.days, "{n} day", "{n} days")}`
                        : tx("Not added")}
                    </strong>
                  </div>

                  <div>
                    <span>{tx("Activities")}</span>
                    <strong>{activities.length ? activities.map((a) => a.name).join(", ") : tx("None added")}</strong>
                  </div>
                </div>
              </section>
</div>

          {/* ==================================================
              RIGHT SIDE — PRICE
          ================================================== */}

          <aside className="trip-review-sidebar">

            <div className="review-price-card">

              <div className="review-price-heading">

                <div>

                  <h2>
                    {tx("Price Summary")}
                  </h2>

                  <span>
                    {tx("Estimated booking amount")}
                  </span>

                </div>

              </div>

              {/* ROOM PRICE */}

              <div className="review-price-row">

                <span>
                  ₹
                  {pricing.pricePerNight.toLocaleString(
                    "en-IN"
                  )}{" "}
                  × {rooms}{" "}
                  {rooms === 1
                    ? tx("room")
                    : tx("rooms")}
                </span>

                <strong>
                  ₹
                  {pricing.roomTotal.toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

              {pricing.mealsTotal > 0 && (
                <div className="review-price-row">
                  <span>{tx("Meals ({list})", { list: mealNames(meals).join(", ") })}</span>
                  <strong>{formatMoney(pricing.mealsTotal)}</strong>
                </div>
              )}

              {pricing.transportTotal > 0 && (
                <div className="review-price-row">
                  <span>{tx("Local travel ({label})", { label: quote?.transport?.label })}</span>
                  <strong>{formatMoney(pricing.transportTotal)}</strong>
                </div>
              )}

              {pricing.activitiesTotal > 0 && (
                <div className="review-price-row">
                  <span>{tx("Activities ({n})", { n: activities.length })}</span>
                  <strong>{formatMoney(pricing.activitiesTotal)}</strong>
                </div>
              )}

              {/* DURATION */}

              <div className="review-price-row">

                <span>
                  {nights}{" "}
                  {nights === 1
                    ? tx("night")
                    : tx("nights")}
                </span>

                <span>
                  {tx("Included")}
                </span>

              </div>

              {/* TAX */}

              <div className="review-price-row">

                <span>
                  {tx("Taxes & Fees")}
                </span>

                <strong>
                  ₹
                  {pricing.taxes.toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

              <div className="review-price-divider" />

              {/* TOTAL */}

              <div className="review-total-row">

                <span>
                  {tx("Total")}
                </span>

                <strong>
                  ₹
                  {pricing.totalAmount.toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

              {/* INFO */}

              <p className="review-demo-note">
                {tx("The final booking amount is calculated and validated by the VOYARA backend before payment.")}
              </p>

              {/* CONFIRM */}

              <button
                className="review-confirm-btn"
                onClick={handleConfirmBooking}
                disabled={submitting}
              >

                {submitting ? (
                  <>
                    <Loader2
                      size={18}
                      className="spin"
                    />

                    {tx("Creating Booking...")}
                  </>
                ) : (
                  <>
                    {tx("Confirm Booking")}

                    <Check size={18} />
                  </>
                )}

              </button>

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

export default TripReview;