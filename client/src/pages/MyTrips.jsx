import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Hotel,
  MapPin,
  Users,
  XCircle,
  X,
} from "lucide-react";

import { cancelBookingRequest, changeBookingDates, getCancellationQuote, getMyBookings } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import PageHero from "../components/PageHero";
import { plural } from "../i18n/plural";
import { dateLocale } from "../i18n/runtime";

const MyTrips = () => {
  const { t: tx } = useLanguage();

  const navigate = useNavigate();
  const { t } = useLanguage();

  const { isAuthenticated, loading: authLoading } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cancel flow: { booking, quote, checking, submitting, error }
  const [cancelFlow, setCancelFlow] = useState(null);
  const [notice, setNotice] = useState("");

  // Change-dates flow: { booking, checkIn, checkOut, preview, checking, submitting, error }
  const [changeFlow, setChangeFlow] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: "/trips",
        },
        replace: true,
      });

      return;
    }

    const loadBookings = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getMyBookings();

        if (!response.success) {
          setError(
            response.message || tx("Unable to load your trips.")
          );
          return;
        }

        setBookings(response.data || []);
      } catch (err) {
        console.error("My Trips Error:", err);

        if (err.response?.status === 401) {
          setError(
            tx("Your session has expired. Please login again.")
          );
        } else {
          setError(
            tx("Unable to load your trips right now.")
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [authLoading, isAuthenticated, navigate]);

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString(dateLocale(),
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusIcon = (status) => {
    if (status === "confirmed") {
      return <CheckCircle2 size={17} />;
    }

    if (status === "cancelled") {
      return <XCircle size={17} />;
    }

    return <Clock3 size={17} />;
  };

  const getStatusClass = (status) => {
    if (status === "confirmed") {
      return "booking-status confirmed";
    }

    if (status === "cancelled") {
      return "booking-status cancelled";
    }

    return "booking-status pending";
  };

  const getStatusLabel = (status) => {
    if (!status) return tx("Pending");

    return tx(
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );
  };

  const tripStats = useMemo(() => {
    return {
      total: bookings.length,
      confirmed: bookings.filter(
        (booking) => booking.status === "confirmed"
      ).length,
      pending: bookings.filter(
        (booking) => booking.status === "pending"
      ).length,
      cancelled: bookings.filter(
        (booking) => booking.status === "cancelled"
      ).length,
    };
  }, [bookings]);

  const startCancel = async (booking) => {
    setNotice("");
    setCancelFlow({ booking, quote: null, checking: true, submitting: false, error: "" });

    try {
      const res = await getCancellationQuote(booking._id);
      setCancelFlow((c) => c && { ...c, quote: res.data, checking: false });
    } catch (err) {
      setCancelFlow((c) => c && {
        ...c,
        checking: false,
        error: err.response?.data?.message || tx("Could not check the cancellation policy."),
      });
    }
  };

  const confirmCancel = async () => {
    if (!cancelFlow || cancelFlow.submitting) return;

    setCancelFlow((c) => ({ ...c, submitting: true, error: "" }));

    try {
      const res = await cancelBookingRequest(cancelFlow.booking._id);

      setBookings((list) => list.map((b) => (b._id === res.data._id ? res.data : b)));
      setNotice(res.message || tx("Booking cancelled."));
      setCancelFlow(null);
    } catch (err) {
      setCancelFlow((c) => ({
        ...c,
        submitting: false,
        error: err.response?.data?.message || tx("Could not cancel this booking."),
      }));
    }
  };

  const dayInput = (date) => new Date(date).toISOString().slice(0, 10);

  const startChange = (booking) => {
    setNotice("");
    setChangeFlow({
      booking,
      checkIn: dayInput(booking.checkIn),
      checkOut: dayInput(booking.checkOut),
      preview: null,
      checking: false,
      submitting: false,
      error: "",
    });
  };

  // picking different dates clears the old price check
  const pickDate = (field, value) =>
    setChangeFlow((c) => ({ ...c, [field]: value, preview: null, error: "" }));

  const checkChange = async () => {
    const { booking, checkIn, checkOut } = changeFlow;

    setChangeFlow((c) => ({ ...c, checking: true, preview: null, error: "" }));

    try {
      const res = await changeBookingDates(booking._id, { checkIn, checkOut, dryRun: true });

      setChangeFlow((c) => ({ ...c, checking: false, preview: res.data }));
    } catch (err) {
      setChangeFlow((c) => ({ ...c, checking: false, error: err.response?.data?.message || tx("Could not check these dates.") }));
    }
  };

  const confirmChange = async () => {
    const { booking, checkIn, checkOut } = changeFlow;

    setChangeFlow((c) => ({ ...c, submitting: true, error: "" }));

    try {
      const res = await changeBookingDates(booking._id, { checkIn, checkOut });

      setBookings((list) => list.map((b) => (b._id === res.data.booking._id ? res.data.booking : b)));
      setNotice(res.message || tx("Your dates were changed."));
      setChangeFlow(null);
    } catch (err) {
      setChangeFlow((c) => ({ ...c, submitting: false, error: err.response?.data?.message || tx("Could not change the dates.") }));
    }
  };

  const handleViewDetails = (booking) => {
    navigate("/trip-confirmation", {
      state: {
        booking,
        fromMyTrips: true,
      },
    });
  };

  if (authLoading || loading) {
    return (
      <div className="my-trips-page">
        <div className="container">
          <div className="trips-loading">
            <div className="trips-spinner" />
            <p>{tx("Loading your trips...")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="my-trips-page">
      <PageHero
        eyebrow={tx("My Travel Dashboard")}
        icon={<Briefcase />}
        title={tx("My Trips")}
        subtitle={tx("View and manage your VOYARA bookings in one place.")}
        actions={
          <Link to="/" className="page-hero-btn">
            <ArrowLeft size={17} />
            {tx("Plan New Trip")}
          </Link>
        }
      />

      <div className="container">

        {/* ==================================================
            STATS
        ================================================== */}

        {notice && (
          <div className="trips-notice" role="status">
            {notice}
            <button type="button" onClick={() => setNotice("")} aria-label={tx("Dismiss")}>
              <X size={16} />
            </button>
          </div>
        )}

        {bookings.length > 0 && (
          <div className="trips-stats">

            <div className="trip-stat-card">
              <span>{tx("Total Trips")}</span>
              <strong>{tripStats.total}</strong>
            </div>

            <div className="trip-stat-card">
              <span>{tx("Confirmed")}</span>
              <strong>{tripStats.confirmed}</strong>
            </div>

            <div className="trip-stat-card">
              <span>{tx("Pending")}</span>
              <strong>{tripStats.pending}</strong>
            </div>

            <div className="trip-stat-card">
              <span>{tx("Cancelled")}</span>
              <strong>{tripStats.cancelled}</strong>
            </div>

          </div>
        )}

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="trips-error">
            {error}
          </div>
        )}

        {/* ==================================================
            EMPTY STATE
        ================================================== */}

        {!error && bookings.length === 0 && (
          <div className="trips-empty">

            <div className="trips-empty-icon">
              <Briefcase size={32} />
            </div>

            <h2>{tx("No trips yet")}</h2>

            <p>
              {tx("You haven't created any VOYARA bookings yet.")}
            </p>

            <Link
              to="/"
              className="btn btn-primary"
            >
              {tx("Plan Your First Trip")}
            </Link>

          </div>
        )}

        {/* ==================================================
            BOOKING LIST
        ================================================== */}

        {bookings.length > 0 && (
          <div className="trips-list">

            <div className="trips-count">{plural(tx, bookings.length, "{n} booking found", "{n} bookings found")}</div>

            {bookings.map((booking) => (
              <article
                key={booking._id}
                className="booking-card"
              >

                {/* ==================================================
                    CARD HEADER
                ================================================== */}

                <div className="booking-card-header">

                  <div>
                    <span className="booking-reference">
                      {booking.bookingReference}
                    </span>

                    <h2>
                      {booking.destination?.name ||
                        tx("India Trip")}
                    </h2>
                  </div>

                  <div
                    className={getStatusClass(
                      booking.status
                    )}
                  >
                    {getStatusIcon(
                      booking.status
                    )}

                    <span>
                      {getStatusLabel(
                        booking.status
                      )}
                    </span>
                  </div>

                </div>

                {/* ==================================================
                    BOOKING DETAILS
                ================================================== */}

                <div className="booking-details-grid">

                  {/* DESTINATION */}

                  <div className="booking-detail">
                    <MapPin size={18} />

                    <div>
                      <span>
                        {tx("Destination")}
                      </span>

                      <strong>
                        {booking.destination?.city ||
                          booking.destination?.name ||
                          "—"}
                      </strong>

                      <small>
                        {booking.destination?.state ||
                          ""}
                      </small>
                    </div>
                  </div>

                  {/* DATES */}

                  <div className="booking-detail">
                    <CalendarDays size={18} />

                    <div>
                      <span>
                        {tx("Travel Dates")}
                      </span>

                      <strong>
                        {formatDate(
                          booking.checkIn
                        )}
                      </strong>

                      <small>{tx("to {date}", { date: formatDate(booking.checkOut) })}</small>
                    </div>
                  </div>

                  {/* ACCOMMODATION */}

                  <div className="booking-detail">
                    <Hotel size={18} />

                    <div>
                      <span>
                        {tx("Stay")}
                      </span>

                      <strong>
                        {booking.accommodation
                          ?.name || "—"}
                      </strong>

                      <small>
                        {booking.room?.name || ""}
                      </small>
                    </div>
                  </div>

                  {/* TRAVELERS */}

                  <div className="booking-detail">
                    <Users size={18} />

                    <div>
                      <span>
                        {tx("Travellers")}
                      </span>

                      <strong>{plural(tx, booking.adults || 0, "{n} Adult", "{n} Adults")}</strong>

                      <small>{plural(tx, booking.children || 0, "{n} Child", "{n} Children")} · {plural(tx, booking.rooms || 1, "{n} Room", "{n} Rooms")}</small>
                    </div>
                  </div>

                </div>

                {/* ==================================================
                    SELECTED PLACES
                ================================================== */}

                {booking.selectedPlaces?.length >
                  0 && (
                  <div className="booking-places">

                    <span>
                      {tx("Selected Places")}
                    </span>

                    <div>
                      {booking.selectedPlaces.map(
                        (place, index) => (
                          <span
                            key={
                              place.placeId ||
                              place.id ||
                              `${place.name}-${index}`
                            }
                            className="booking-place-tag"
                          >
                            {tx(place.name)}
                          </span>
                        )
                      )}
                    </div>

                  </div>
                )}

                {/* ==================================================
                    CARD FOOTER
                ================================================== */}

                <div className="booking-card-footer">

                  <div>
                    <span>
                      {tx("Payment")}
                    </span>

                    <strong
                      className={`payment-status ${
                        booking.paymentStatus || "pending"
                      }`}
                    >
                      {getStatusLabel(
                        booking.paymentStatus ||
                          "pending"
                      )}
                    </strong>
                  </div>

                  <div className="booking-total">
                    <span>
                      {tx("Total Amount")}
                    </span>

                    <strong>
                      {formatCurrency(
                        booking.pricing
                          ?.totalAmount
                      )}
                    </strong>
                  </div>

                </div>

                {/* ==================================================
                    ACTIONS
                ================================================== */}

                {(booking.pricing?.addonsTotal > 0) && (
                  <div className="booking-extras-line">
                    {["breakfast", "lunch", "dinner"].some((m) => booking.addons?.meals?.[m]) && (
                      <span>{tx("Meals: {list}", { list: ["breakfast", "lunch", "dinner"].filter((m) => booking.addons.meals[m]).map((m) => m.charAt(0).toUpperCase()).join(" + ") })}</span>
                    )}
                    {booking.addons?.transport?.mode && (
                      <span>
                        {tx(booking.addons.transport.label)} ({booking.addons.transport.ac ? "AC" : tx("Non-AC")})
                      </span>
                    )}
                    {booking.addons?.activities?.length > 0 && (
                      <span>{plural(tx, booking.addons.activities.length, "{n} activity", "{n} activities")}</span>
                    )}
                  </div>
                )}

                <div className="booking-card-actions">

                  {booking.status === "cancelled" ? (
                    <span className="booking-cancel-note">
                      {booking.cancellation?.refundAmount > 0
                        ? tx("Refund of {amount} initiated", { amount: formatCurrency(booking.cancellation.refundAmount) })
                        : tx("Cancelled, no refund due")}
                    </span>
                  ) : (
                    new Date(booking.checkIn) > new Date() && (
                      <>
                        <button
                          type="button"
                          className="booking-change-btn"
                          onClick={() => startChange(booking)}
                        >
                          <CalendarClock size={16} />
                          {t("trips.change")}
                        </button>

                        <button
                          type="button"
                          className="booking-cancel-btn"
                          onClick={() => startCancel(booking)}
                        >
                          {t("trips.cancel")}
                        </button>
                      </>
                    )
                  )}

                  <button
                    type="button"
                    className="booking-view-btn"
                    onClick={() =>
                      handleViewDetails(
                        booking
                      )
                    }
                  >
                    <Eye size={17} />
                    {t("trips.view")}
                  </button>

                </div>

              </article>
            ))}

          </div>
        )}

      </div>

      {changeFlow && (
        <div className="cancel-backdrop" onClick={() => !changeFlow.submitting && setChangeFlow(null)}>
          <div className="cancel-modal change-dates-modal" role="dialog" aria-modal="true" aria-label={tx("Change dates")} onClick={(e) => e.stopPropagation()}>
            <h2>{t("trips.changeTitle")}</h2>

            <p className="cancel-ref">
              {changeFlow.booking.bookingReference} · {tx(changeFlow.booking.accommodation?.name)}
            </p>

            <div className="change-dates-fields">
              <label>
                {t("trips.checkIn")}
                <input
                  type="date"
                  value={changeFlow.checkIn}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => pickDate("checkIn", e.target.value)}
                />
              </label>

              <label>
                {t("trips.checkOut")}
                <input
                  type="date"
                  value={changeFlow.checkOut}
                  min={changeFlow.checkIn}
                  onChange={(e) => pickDate("checkOut", e.target.value)}
                />
              </label>
            </div>

            {changeFlow.booking.paymentStatus === "paid" && (
              <p className="cancel-muted">{t("trips.paidNote")}</p>
            )}

            {changeFlow.preview && (
              <div className="cancel-policy refund">{plural(tx, changeFlow.preview.nights, "Available! {n} night, new total", "Available! {n} nights, new total")} <strong>{formatCurrency(changeFlow.preview.newTotal)}</strong>{changeFlow.preview.difference !== 0 && (<> ({tx(changeFlow.preview.difference > 0 ? "{amount} more than {old}" : "{amount} less than {old}", { amount: formatCurrency(Math.abs(changeFlow.preview.difference)), old: formatCurrency(changeFlow.preview.oldTotal) })})</>)}.</div>
            )}

            {changeFlow.error && <div className="cancel-error">{changeFlow.error}</div>}

            <div className="cancel-actions">
              <button type="button" className="cancel-keep" onClick={() => setChangeFlow(null)} disabled={changeFlow.submitting}>
                {t("trips.keepDates")}
              </button>

              {!changeFlow.preview ? (
                <button
                  type="button"
                  className="cancel-confirm change-check"
                  onClick={checkChange}
                  disabled={changeFlow.checking || !changeFlow.checkIn || !changeFlow.checkOut}
                >
                  {t(changeFlow.checking ? "trips.checking" : "trips.checkPrice")}
                </button>
              ) : (
                <button type="button" className="cancel-confirm change-check" onClick={confirmChange} disabled={changeFlow.submitting}>
                  {t(changeFlow.submitting ? "trips.saving" : "trips.confirmDates")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {cancelFlow && (
        <div className="cancel-backdrop" onClick={() => !cancelFlow.submitting && setCancelFlow(null)}>
          <div className="cancel-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>{t("trips.cancelTitle")}</h2>

            <p className="cancel-ref">
              {cancelFlow.booking.bookingReference} · {tx(cancelFlow.booking.accommodation?.name)}
            </p>

            {cancelFlow.checking && <p className="cancel-muted">{t("trips.cancelChecking")}</p>}

            {cancelFlow.quote && (
              <div className={`cancel-policy ${cancelFlow.quote.refundAmount > 0 ? "refund" : ""}`}>
                {cancelFlow.quote.canCancel ? cancelFlow.quote.message : cancelFlow.quote.reason}
              </div>
            )}

            {cancelFlow.error && <div className="cancel-error">{cancelFlow.error}</div>}

            <div className="cancel-actions">
              <button
                type="button"
                className="cancel-keep"
                onClick={() => setCancelFlow(null)}
                disabled={cancelFlow.submitting}
              >
                {t("trips.keep")}
              </button>

              {cancelFlow.quote?.canCancel && (
                <button
                  type="button"
                  className="cancel-confirm"
                  onClick={confirmCancel}
                  disabled={cancelFlow.submitting}
                >
                  {cancelFlow.submitting ? t("trips.cancelling") : t("trips.cancelYes")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTrips;