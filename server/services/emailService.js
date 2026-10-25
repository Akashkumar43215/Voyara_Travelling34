/**
 * Emails for booking events: payment received and cancellation.
 *
 * Off until SMTP is configured (SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM). Without it
 * nothing is sent and nothing breaks: sendMail just reports { sent: false }.
 * A mail problem must never fail a booking, so every failure is caught and logged.
 *
 * Messages are built from text the traveler typed, so all of it is escaped for HTML and
 * line breaks are stripped from header fields.
 */

const nodemailer = require("nodemailer");

const isConfigured = () => Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" } : undefined,
    });
  }

  return transporter;
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const oneLine = (value) => String(value ?? "").replace(/[\r\n]+/g, " ").trim();

const inr = (amount) => `₹${Math.round(Number(amount) || 0).toLocaleString("en-IN")}`;

const day = (date) => (date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

const rows = (booking) => [
  ["Booking reference", booking.bookingReference],
  ["Destination", booking.destination?.name],
  ["Hotel", booking.accommodation?.name],
  ["Room", booking.room?.name],
  ["Check-in", day(booking.checkIn)],
  ["Check-out", day(booking.checkOut)],
  ["Guests", `${booking.adults || 0} adult(s)${booking.children ? `, ${booking.children} child(ren)` : ""}`],
  ["Total", inr(booking.pricing?.totalAmount)],
];

const layout = (title, intro, booking, outro) => {
  const table = rows(booking)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#6b7785">${escapeHtml(k)}</td><td style="padding:6px 12px;font-weight:700">${escapeHtml(v)}</td></tr>`)
    .join("");

  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1a1a1a">
<h2 style="color:#0a2a5e">${escapeHtml(title)}</h2><p>${escapeHtml(intro)}</p>
<table style="border-collapse:collapse;background:#f4f9ff;border-radius:8px;width:100%">${table}</table>
<p>${escapeHtml(outro)}</p><p style="color:#6b7785;font-size:12px">VOYARA demo project. This is an automated message.</p></div>`;

  const text = [title, "", intro, "", ...rows(booking).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), "", outro].join("\n");

  return { html, text };
};

const templates = {
  paid: (booking) => ({
    subject: `Booking confirmed: ${oneLine(booking.bookingReference)}`,
    ...layout("Your booking is confirmed", `Hi ${oneLine(booking.traveler?.name) || "traveler"}, we received your payment and your trip is confirmed.`, booking, "You can view or cancel it anytime from My Trips."),
  }),
  changed: (booking) => ({
    subject: `Dates changed: ${oneLine(booking.bookingReference)}`,
    ...layout("Your dates were changed", `Hi ${oneLine(booking.traveler?.name) || "traveler"}, your booking now has new dates.`, booking, "If you did not make this change, please contact us right away."),
  }),
  cancelled: (booking) => ({
    subject: `Booking cancelled: ${oneLine(booking.bookingReference)}`,
    ...layout(
      "Your booking was cancelled",
      `Hi ${oneLine(booking.traveler?.name) || "traveler"}, this booking has been cancelled.`,
      booking,
      booking.cancellation?.refundAmount > 0
        ? `A refund of ${inr(booking.cancellation.refundAmount)} has been initiated.`
        : "No refund is due for this booking."
    ),
  }),
};

/** Sends one booking email. Never throws. Resolves { sent, reason? }. */
const sendBookingEmail = async (type, booking) => {
  try {
    const build = templates[type];
    const to = oneLine(booking?.traveler?.email);

    if (!build || !to) return { sent: false, reason: "nothing to send" };
    if (!isConfigured()) return { sent: false, reason: "email is not configured" };

    const message = build(booking);

    await getTransporter().sendMail({ from: process.env.MAIL_FROM, to, subject: message.subject, text: message.text, html: message.html });

    return { sent: true };
  } catch (error) {
    console.error("Email error:", error.message);
    return { sent: false, reason: "send failed" };
  }
};

module.exports = { isConfigured, sendBookingEmail, templates, escapeHtml };
