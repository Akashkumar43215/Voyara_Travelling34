import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Download,
  Hotel,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
  BedDouble,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { plural } from "../i18n/plural";
import { dateLocale } from "../i18n/runtime";

const TripConfirmation = () => {
  const { t: tx } = useLanguage();

  const location = useLocation();
  const navigate = useNavigate();

  const booking = location.state?.booking || null;

  // ======================================================
  // MISSING BOOKING
  // ======================================================

  if (!booking) {
    return (
      <div className="trip-confirmation-page">
        <div className="container">
          <div className="confirmation-empty">
            <Check size={44} />

            <h2>{tx("Booking information not found")}</h2>

            <p>
              {tx("We could not find the booking confirmation information for this trip.")}
            </p>

            <button
              className="btn btn-primary"
              onClick={() => navigate("/trips")}
            >
              <ArrowLeft size={17} />
              {tx("Go to My Trips")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const traveler = booking.traveler || {};
  const destination = booking.destination || {};
  const accommodation = booking.accommodation || {};
  const room = booking.room || {};
  const pricing = booking.pricing || {};

  const selectedPlaces =
    booking.selectedPlaces || [];

  const isConfirmed =
    booking.status === "confirmed";

  const isPaid =
    booking.paymentStatus === "paid";

  return (
    <div className="trip-confirmation-page">
      <div className="container">

        {/* ==================================================
            SUCCESS HEADER
        ================================================== */}

        <div className="confirmation-success">

          <div className="confirmation-success-icon">
            <Check size={34} />
          </div>

          <span className="section-tag">
            {tx("BOOKING CONFIRMATION")}
          </span>

          <h1>
            {isConfirmed
              ? tx("Your Trip is Confirmed!")
              : tx("Booking Created Successfully!")}
          </h1>

          <p>
            {isConfirmed
              ? tx("Your VOYARA trip has been successfully confirmed.")
              : tx("Your booking has been created and is awaiting confirmation.")}
          </p>

          <div className="confirmation-reference"> {tx("Booking Reference:")} <strong> {booking.bookingReference} </strong> </div>

        </div>

        {/* ==================================================
            STATUS
        ================================================== */}

        <div className="confirmation-status-grid">

          <div className="confirmation-status-card">

            <div className="confirmation-status-icon">
              <Check size={19} />
            </div>

            <div>
              <span>{tx("Booking Status")}</span>

              <strong>
                {isConfirmed
                  ? tx("Confirmed")
                  : booking.status}
              </strong>
            </div>

          </div>

          <div className="confirmation-status-card">

            <div className="confirmation-status-icon">
              <Check size={19} />
            </div>

            <div>
              <span>{tx("Payment Status")}</span>

              <strong>
                {isPaid
                  ? tx("Paid")
                  : booking.paymentStatus}
              </strong>
            </div>

          </div>

        </div>

        {/* ==================================================
            MAIN GRID
        ================================================== */}

        <div className="confirmation-grid">

          {/* ==================================================
              LEFT CONTENT
          ================================================== */}

          <div className="confirmation-main">

            {/* TRAVELER */}

            <section className="confirmation-card">

              <div className="confirmation-card-heading">

                <div className="confirmation-icon">
                  <User size={20} />
                </div>

                <div>
                  <h2>{tx("Traveler Information")}</h2>

                  <p>
                    {tx("Primary traveler")}
                  </p>
                </div>

              </div>

              <div className="confirmation-traveler-grid">

                <div>
                  <span>
                    <User size={15} />
                    {tx("Name")}
                  </span>

                  <strong>
                    {traveler.name || "--"}
                  </strong>
                </div>

                <div>
                  <span>
                    <Mail size={15} />
                    {tx("Email")}
                  </span>

                  <strong>
                    {traveler.email || "--"}
                  </strong>
                </div>

                <div>
                  <span>
                    <Phone size={15} />
                    {tx("Phone")}
                  </span>

                  <strong>
                    {traveler.phone || "--"}
                  </strong>
                </div>

              </div>

            </section>

            {/* DESTINATION */}

            <section className="confirmation-card">

              <div className="confirmation-card-heading">

                <div className="confirmation-icon">
                  <MapPin size={20} />
                </div>

                <div>
                  <h2>{tx("Destination")}</h2>

                  <p>
                    {tx("Your selected destination")}
                  </p>
                </div>

              </div>

              <div className="confirmation-destination">

                <h3>
                  {destination.name ||
                    destination.city ||
                    "--"}
                </h3>

                <p>
                  {[
                    destination.city,
                    destination.state,
                    destination.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>

              </div>

            </section>

            {/* ACCOMMODATION */}

            <section className="confirmation-card">

              <div className="confirmation-card-heading">

                <div className="confirmation-icon">
                  <Hotel size={20} />
                </div>

                <div>
                  <h2>{tx("Accommodation")}</h2>

                  <p>
                    {tx("Your selected stay")}
                  </p>
                </div>

              </div>

              <div className="confirmation-stay">

                <div className="confirmation-stay-icon">
                  <Hotel size={28} />
                </div>

                <div>
                  <h3>
                    {accommodation.name ||
                      "--"}
                  </h3>

                  {accommodation.address && (
                    <p>
                      {accommodation.address}
                    </p>
                  )}

                </div>

              </div>

            </section>

            {/* STAY DETAILS */}

            <section className="confirmation-card">

              <div className="confirmation-card-heading">

                <div className="confirmation-icon">
                  <CalendarDays size={20} />
                </div>

                <div>
                  <h2>{tx("Stay Details")}</h2>

                  <p>
                    {tx("Your booking dates and guests")}
                  </p>
                </div>

              </div>

              <div className="confirmation-details-grid">

                <div>
                  <span>
                    <CalendarDays size={15} />
                    {tx("Check-in")}
                  </span>

                  <strong>
                    {formatDate(
                      booking.checkIn
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    <CalendarDays size={15} />
                    {tx("Check-out")}
                  </span>

                  <strong>
                    {formatDate(
                      booking.checkOut
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    <BedDouble size={15} />
                    {tx("Room")}
                  </span>

                  <strong>
                    {room.name || "--"}
                  </strong>
                </div>

                <div>
                  <span>
                    <Users size={15} />
                    {tx("Guests")}
                  </span>

                  <strong>{plural(tx, booking.adults || 0, "{n} Adult", "{n} Adults")}{booking.children > 0 ? " + " + plural(tx, booking.children, "{n} Child", "{n} Children") : ""}</strong>
                </div>

                <div>
                  <span>{tx("Nights")}</span>

                  <strong>
                    {booking.nights || 0}
                  </strong>
                </div>

                <div>
                  <span>{tx("Rooms")}</span>

                  <strong>
                    {booking.rooms || 0}
                  </strong>
                </div>

              </div>

            </section>

            {/* TOURIST PLACES */}

            <section className="confirmation-card">

              <div className="confirmation-card-heading">

                <div className="confirmation-icon">
                  <MapPin size={20} />
                </div>

                <div>
                  <h2>
                    {tx("Selected Tourist Places")}
                  </h2>

                  <p>{tx("{n} places in your itinerary", { n: selectedPlaces.length })}</p>
                </div>

              </div>

              <div className="confirmation-places">

                {selectedPlaces.length === 0 ? (
                  <p>
                    {tx("No tourist places selected.")}
                  </p>
                ) : (
                  selectedPlaces.map(
                    (place, index) => (
                      <div
                        className="confirmation-place"
                        key={
                          place.placeId ||
                          `${place.name}-${index}`
                        }
                      >
                        <span>
                          {index + 1}
                        </span>

                        <strong>
                          {tx(place.name)}
                        </strong>

                        <Check size={17} />
                      </div>
                    )
                  )
                )}

              </div>

            </section>

          
              <section className="confirmation-card">
                <div className="confirmation-card-heading">
                  <div className="confirmation-icon">
                    <Check size={20} />
                  </div>
                  <div>
                    <h2>{tx("Meals, travel & activities")}</h2>
                    <p>{tx("Included in your booking")}</p>
                  </div>
                </div>

                <div className="review-extras">
                  <div>
                    <span>{tx("Meals")}</span>
                    <strong>
                      {["breakfast", "lunch", "dinner"].filter((m) => booking.addons?.meals?.[m]).length
                        ? ["breakfast", "lunch", "dinner"]
                            .filter((m) => booking.addons.meals[m])
                            .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
                            .join(", ") + " included"
                        : tx("Food excluded (room only)")}
                    </strong>
                  </div>

                  <div>
                    <span>{tx("Local travel")}</span>
                    <strong>
                      {booking.addons?.transport?.mode
                        ? `${booking.addons.transport.label}, ${booking.addons.transport.ac ? "AC" : tx("Non-AC")} · ${plural(tx, booking.addons.transport.days, "{n} day", "{n} days")}`
                        : tx("Not added")}
                    </strong>
                  </div>

                  <div>
                    <span>{tx("Activities")}</span>
                    <strong>
                      {booking.addons?.activities?.length
                        ? booking.addons.activities.map((a) => a.name).join(", ")
                        : tx("None added")}
                    </strong>
                  </div>
                </div>
              </section>
</div>

          {/* ==================================================
              RIGHT SUMMARY
          ================================================== */}

          <aside className="confirmation-sidebar">

            <div className="confirmation-price-card">

              <div className="confirmation-price-heading">
                <h2>{tx("Payment Summary")}</h2>

                <span>
                  {isPaid
                    ? tx("Paid")
                    : tx("Pending")}
                </span>
              </div>

              <div className="confirmation-price-row">
                <span>
                  {tx("Room Cost")}
                </span>

                <strong>
                  ₹
                  {Number(
                    pricing.roomTotal || 0
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

              {pricing.mealsTotal > 0 && (
                <div className="confirmation-price-row">
                  <span>{tx("Meals")}</span>
                  <strong>₹{Number(pricing.mealsTotal).toLocaleString("en-IN")}</strong>
                </div>
              )}

              {pricing.transportTotal > 0 && (
                <div className="confirmation-price-row">
                  <span>{tx("Local travel")}</span>
                  <strong>₹{Number(pricing.transportTotal).toLocaleString("en-IN")}</strong>
                </div>
              )}

              {pricing.activitiesTotal > 0 && (
                <div className="confirmation-price-row">
                  <span>{tx("Activities")}</span>
                  <strong>₹{Number(pricing.activitiesTotal).toLocaleString("en-IN")}</strong>
                </div>
              )}

              <div className="confirmation-price-row">
                <span>
                  {tx("Tax")}
                </span>

                <strong>
                  ₹
                  {Number(
                    pricing.taxes || 0
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

              <div className="confirmation-price-divider" />

              <div className="confirmation-total">
                <span>{tx("Total Paid")}</span>

                <strong>
                  ₹
                  {Number(
                    pricing.totalAmount || 0
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

              <div className="confirmation-paid-badge">
                <Check size={17} />

                {isPaid
                  ? tx("Payment Successful")
                  : tx("Payment Pending")}
              </div>

            </div>

            {/* ACTIONS */}

            <div className="confirmation-actions">

              <button
                className="btn btn-primary"
                onClick={() =>
                  navigate("/trips")
                }
              >
                <CalendarDays size={17} />
                {tx("View My Trips")}
              </button>

              <button
                className="confirmation-home-btn"
                onClick={() =>
                  navigate("/")
                }
              >
                <ArrowLeft size={17} />
                {tx("Back to Home")}
              </button>

            </div>

            <div className="confirmation-note">
              <strong>
                {tx("Keep your booking reference")}
              </strong>

              <p>{tx("Use {ref} to identify your booking.", { ref: booking.bookingReference })}</p>
            </div>

          </aside>

        </div>

      </div>
    </div>
  );
};

// ======================================================
// DATE HELPER
// ======================================================

const formatDate = (date) => {
  if (!date) {
    return "--";
  }

  return new Date(date).toLocaleDateString(dateLocale(),
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};

export default TripConfirmation;