import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Hotel,
  Loader2,
  Lock,
  MapPin,
  Smartphone,
  User,
} from "lucide-react";
import { completeDemoPayment, getPaymentConfig, createPaymentOrder, verifyPayment } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import PageHero from "../components/PageHero";

import { tg, dateLocale } from "../i18n/runtime";
const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

// Razorpay checkout is loaded only on this page, and only when online payment is on
const loadCheckout = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();

    const script = document.createElement("script");

    script.src = CHECKOUT_SRC;
    script.onload = resolve;
    script.onerror = () => reject(new Error(tg("Could not load the payment window. Check your connection and try again.")));
    document.body.appendChild(script);
  });

const Payment = () => {
  const { t: tx } = useLanguage();

  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();

  const booking = location.state?.booking || null;

  const [method, setMethod] = useState("card");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("demo");

  // demo checkout or Razorpay: decided by the server
  useEffect(() => {
    getPaymentConfig()
      .then((config) => setMode(config.mode === "razorpay" ? "razorpay" : "demo"))
      .catch(() => setMode("demo"));
  }, []);

  // ======================================================
  // MISSING BOOKING
  // ======================================================

  if (!booking) {
    return (
      <div className="payment-page">
        <div className="container">

          <div className="payment-empty">

            <CreditCard size={42} />

            <h2>
              {tx("Payment information is missing")}
            </h2>

            <p>
              {tx("Please return to your trip review and start the booking process again.")}
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

        </div>
      </div>
    );
  }

  // ======================================================
  // BOOKING DATA
  // ======================================================

  const bookingId = booking._id;

  const totalAmount = Number(
    booking.pricing?.totalAmount || 0
  );

  const roomTotal = Number(
    booking.pricing?.roomTotal || 0
  );

  const mealsTotal = Number(booking.pricing?.mealsTotal || 0);
  const transportTotal = Number(booking.pricing?.transportTotal || 0);
  const activitiesTotal = Number(booking.pricing?.activitiesTotal || 0);

  const taxes = Number(
    booking.pricing?.taxes || 0
  );

  const paymentStatus =
    booking.paymentStatus || "pending";

  const bookingStatus =
    booking.status || "pending";

  // ======================================================
  // PAYMENT
  // ======================================================

  // The server creates the order for the amount it priced. Razorpay takes the card or UPI
  // details in its own window, then hands back a signed result that the server checks.
  const payOnline = async () => {
    try {
      setProcessing(true);

      const [order] = await Promise.all([createPaymentOrder(bookingId), loadCheckout()]);

      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: "VOYARA",
          description: `Booking ${order.reference}`,
          prefill: {
            name: booking.traveler?.name,
            email: booking.traveler?.email,
            contact: booking.traveler?.phone,
          },
          theme: { color: "#065af3" },
          handler: async (result) => {
            try {
              const response = await verifyPayment(bookingId, result);

              navigate("/trip-confirmation", { state: { booking: response.data, paymentSuccessful: true } });
              resolve();
            } catch (verifyError) {
              reject(verifyError);
            }
          },
          modal: { ondismiss: () => resolve() },
        });

        checkout.on("payment.failed", (failure) => reject(new Error(failure?.error?.description || tx("The payment failed. You were not charged."))));
        checkout.open();
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || tx("Payment failed. Please try again."));
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    setError("");

    // ----------------------------------------------------
    // AUTH CHECK
    // ----------------------------------------------------

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: "/payment",
          booking,
        },
      });

      return;
    }

    // ----------------------------------------------------
    // BOOKING ID CHECK
    // ----------------------------------------------------

    if (!bookingId) {
      setError(
        tx("Booking ID is missing. Please restart the booking process.")
      );

      return;
    }

    // ----------------------------------------------------
    // ALREADY PAID
    // ----------------------------------------------------

    if (paymentStatus === "paid") {
      navigate("/trip-confirmation", {
        state: {
          booking,
          paymentSuccessful: true,
        },
      });

      return;
    }

    if (mode === "razorpay") {
      await payOnline();

      return;
    }

    try {
      setProcessing(true);

      // --------------------------------------------------
      // COMPLETE DEMO PAYMENT
      // --------------------------------------------------

      const response =
        await completeDemoPayment(
          bookingId
        );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            tx("Payment could not be completed.")
        );
      }

      // --------------------------------------------------
      // PAYMENT SUCCESS
      // --------------------------------------------------

      navigate("/trip-confirmation", {
        state: {
          booking: response.data,
          paymentSuccessful: true,
        },
      });

    } catch (error) {
      console.error(
        "Demo payment error:",
        error
      );

      setError(
        error.response?.data?.message ||
          error.message ||
          tx("Payment failed. Please try again.")
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="payment-page">

      <PageHero
        compact
        eyebrow={tx("STEP 9 OF 9 · PAYMENT")}
        icon={<Lock />}
        title={t("pay.title")}
        subtitle={t(mode === "razorpay" ? "pay.subtitleLive" : "pay.subtitleDemo")}
        actions={
          <div className="page-hero-btn">
            <Lock size={16} />
            {t(mode === "razorpay" ? "pay.secure" : "pay.secureDemo")}
          </div>
        }
      />

      <div className="container page-body">

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="payment-error">
            {error}
          </div>
        )}

        {/* ==================================================
            PAYMENT LAYOUT
        ================================================== */}

        <div className="payment-layout">

          {/* ==================================================
              PAYMENT METHODS
          ================================================== */}

          <div className="payment-main">

            {/* BOOKING STATUS */}

            <div className="payment-status-card">

              <div className="payment-status-icon">
                <Check size={20} />
              </div>

              <div>

                <strong>
                  {tx("Booking Created")}
                </strong>

                <span>{tx("Reference: {ref}", { ref: booking.bookingReference })}</span>

              </div>

            </div>

            {/* PAYMENT CARD */}

            {mode === "razorpay" ? (
              <div className="payment-card">
                <div className="payment-card-heading">
                  <CreditCard size={21} />

                  <div>
                    <h2>{t("pay.online")}</h2>
                    <p>{t("pay.onlineHint")}</p>
                  </div>
                </div>

                <div className="payment-demo-box">
                  <div>
                    <strong>{t("pay.private")}</strong>

                    <p>
                      {t("pay.privateBody")}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
            <div className="payment-card">

              <div className="payment-card-heading">

                <CreditCard size={21} />

                <div>

                  <h2>
                    {tx("Payment Method")}
                  </h2>

                  <p>
                    {tx("Select a demo payment method.")}
                  </p>

                </div>

              </div>

              {/* CARD */}

              <button
                type="button"
                className={`payment-method ${
                  method === "card"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setMethod("card")
                }
                disabled={processing}
              >

                <CreditCard size={22} />

                <div>

                  <strong>
                    {tx("Credit / Debit Card")}
                  </strong>

                  <span>
                    {tx("Demo card payment")}
                  </span>

                </div>

                {method === "card" && (
                  <Check size={19} />
                )}

              </button>

              {/* UPI */}

              <button
                type="button"
                className={`payment-method ${
                  method === "upi"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setMethod("upi")
                }
                disabled={processing}
              >

                <Smartphone size={22} />

                <div>

                  <strong>
                    UPI
                  </strong>

                  <span>
                    {tx("Demo UPI payment")}
                  </span>

                </div>

                {method === "upi" && (
                  <Check size={19} />
                )}

              </button>

              {/* DEMO NOTICE */}

              <div className="payment-demo-box">

                <div>

                  <strong>
                    {tx("Demo Payment")}
                  </strong>

                  <p>
                    {tx("No real money will be charged. This payment only demonstrates the VOYARA booking workflow.")}
                  </p>

                </div>

              </div>

              {/* CARD DETAILS */}

              {method === "card" && (
                <div className="payment-demo-fields">

                  <div className="payment-field">

                    <label>
                      {tx("Card Number")}
                    </label>

                    <input
                      type="text"
                      value="4111 1111 1111 1111"
                      readOnly
                    />

                  </div>

                  <div className="payment-field-row">

                    <div className="payment-field">

                      <label>
                        {tx("Expiry")}
                      </label>

                      <input
                        type="text"
                        value="12/30"
                        readOnly
                      />

                    </div>

                    <div className="payment-field">

                      <label>
                        {tx("CVV")}
                      </label>

                      <input
                        type="text"
                        value="123"
                        readOnly
                      />

                    </div>

                  </div>

                </div>
              )}

              {/* UPI DETAILS */}

              {method === "upi" && (
                <div className="payment-demo-fields">

                  <div className="payment-field">

                    <label>
                      {tx("Demo UPI ID")}
                    </label>

                    <input
                      type="text"
                      value="voyara@demo"
                      readOnly
                    />

                  </div>

                </div>
              )}

            </div>

            )}

            {/* SECURITY */}

            <div className="payment-security-note">

              <Lock size={17} />

              <div>

                <strong>
                  {mode === "razorpay" ? tx("Secure Checkout") : tx("Secure Demo Checkout")}
                </strong>

                <span>
                  {mode === "razorpay"
                    ? tx("The amount is set by VOYARA server, and your booking is confirmed only after Razorpay confirms the payment.")
                    : tx("This project does not process real payments. The backend only changes the demo payment status.")}
                </span>

              </div>

            </div>

          </div>

          {/* ==================================================
              BOOKING SUMMARY
          ================================================== */}

          <aside className="payment-sidebar">

            <div className="payment-summary-card">

              <h2>
                {tx("Booking Summary")}
              </h2>

              {/* REFERENCE */}

              <div className="payment-summary-reference">

                <span>
                  {tx("Booking Reference")}
                </span>

                <strong>
                  {booking.bookingReference}
                </strong>

              </div>

              {/* DESTINATION */}

              <div className="payment-summary-row">

                <span>
                  <MapPin size={15} />
                  {tx("Destination")}
                </span>

                <strong>
                  {tx(booking.destination?.name ||
                    booking.destination?.city ||
                    "--")}
                </strong>

              </div>

              {/* TRAVELER */}

              <div className="payment-summary-row">

                <span>
                  <User size={15} />
                  {tx("Traveler")}
                </span>

                <strong>
                  {booking.traveler?.name ||
                    "--"}
                </strong>

              </div>

              {/* STAY */}

              <div className="payment-summary-row">

                <span>
                  <Hotel size={15} />
                  {tx("Stay")}
                </span>

                <strong>
                  {booking.accommodation?.name ||
                    "--"}
                </strong>

              </div>

              {/* ROOM */}

              <div className="payment-summary-row">

                <span>
                  {tx("Room")}
                </span>

                <strong>
                  {tx(booking.room?.name ||
                    "--")}
                </strong>

              </div>

              {/* ROOMS */}

              <div className="payment-summary-row">

                <span>
                  {tx("Rooms")}
                </span>

                <strong>
                  {booking.rooms}
                </strong>

              </div>

              {/* NIGHTS */}

              <div className="payment-summary-row">

                <span>
                  {tx("Nights")}
                </span>

                <strong>
                  {booking.nights}
                </strong>

              </div>

              {/* DATES */}

              <div className="payment-summary-row">

                <span>
                  {tx("Check-in")}
                </span>

                <strong>
                  {formatDate(
                    booking.checkIn
                  )}
                </strong>

              </div>

              <div className="payment-summary-row">

                <span>
                  {tx("Check-out")}
                </span>

                <strong>
                  {formatDate(
                    booking.checkOut
                  )}
                </strong>

              </div>

              <div className="payment-summary-divider" />

              {/* PRICE */}

              <div className="payment-summary-row">

                <span>
                  {tx("Room Cost")}
                </span>

                <strong>
                  ₹
                  {roomTotal.toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

              {mealsTotal > 0 && (
                <div className="payment-summary-row">
                  <span>{tx("Meals")}</span>
                  <strong>₹{mealsTotal.toLocaleString("en-IN")}</strong>
                </div>
              )}

              {transportTotal > 0 && (
                <div className="payment-summary-row">
                  <span>{tx("Local travel")}</span>
                  <strong>₹{transportTotal.toLocaleString("en-IN")}</strong>
                </div>
              )}

              {activitiesTotal > 0 && (
                <div className="payment-summary-row">
                  <span>{tx("Activities")}</span>
                  <strong>₹{activitiesTotal.toLocaleString("en-IN")}</strong>
                </div>
              )}

              <div className="payment-summary-row">

                <span>
                  {tx("Taxes")}
                </span>

                <strong>
                  ₹
                  {taxes.toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

              {/* TOTAL */}

              <div className="payment-total">

                <span>
                  {tx("Total Amount")}
                </span>

                <strong>
                  ₹
                  {totalAmount.toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

              {/* PAY BUTTON */}

              <button
                className="payment-confirm-btn"
                onClick={handlePayment}
                disabled={processing}
              >

                {processing ? (
                  <>
                    <Loader2
                      size={18}
                      className="spin"
                    />

                    {t("pay.processing")}
                  </>
                ) : (
                  <>
                    {mode === "razorpay" ? t("pay.pay", { amount: totalAmount.toLocaleString("en-IN") }) : t("pay.demoButton")}

                    <Check size={18} />
                  </>
                )}

              </button>

              <p className="payment-note">
                {mode === "razorpay"
                  ? t("pay.processedBy")
                  : t("pay.demoNote")}
              </p>

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

export default Payment;