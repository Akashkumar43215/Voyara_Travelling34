import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { getAdminBookingsPage, downloadBookingsCsv, adminCancelBooking } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { dateLocale } from "../../i18n/runtime";

const money = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);

const day = (date) => (date ? new Date(date).toLocaleDateString(dateLocale(), { day: "2-digit", month: "short", year: "numeric" }) : "—");

const PAGE_SIZE = 10;

const BookingsManager = ({ onChanged }) => {
  const { t: tx } = useLanguage();

  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cancelling, setCancelling] = useState(null);
  const [refund, setRefund] = useState(true);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  // wait for the typing to stop before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [q]);

  const filters = { q: search || undefined, status: status || undefined, paymentStatus: paymentStatus || undefined };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setResult(await getAdminBookingsPage({ ...filters, page, limit: PAGE_SIZE }));
    } catch (err) {
      setError(err.response?.data?.message || tx("Could not load bookings."));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, paymentStatus, page]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    try {
      await downloadBookingsCsv(filters);
    } catch (err) {
      setError(tx("Could not export the bookings."));
    }
  };

  const startCancel = (booking) => {
    setCancelling(booking);
    setRefund(booking.paymentStatus === "paid");
    setReason("");
  };

  const confirmCancel = async () => {
    try {
      setBusy(true);
      const res = await adminCancelBooking(cancelling._id, { refund, reason });
      setNotice(`${cancelling.bookingReference}: ${res.message}`);
      setCancelling(null);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || tx("Could not cancel the booking."));
      setCancelling(null);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setQ("");
    setStatus("");
    setPaymentStatus("");
    setPage(1);
  };

  const hasFilters = Boolean(q || status || paymentStatus);

  return (
    <div className="voyara-admin-card admin-manager">
      <div className="voyara-admin-card-header">
        <div>
          <span className="voyara-admin-card-label">{tx("BOOKINGS")}</span>
          <h2>{tx("All bookings")}</h2>
          <p>{tx("{n} found. Click a row to open the booking.", { n: result.total })}</p>
        </div>

        <button type="button" className="voyara-admin-outline-btn admin-btn-icon" onClick={exportCsv}>
          <Download size={15} /> {tx("Export CSV")}
        </button>
      </div>

      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx("Search reference, traveler, email, destination")} maxLength={80} aria-label={tx("Search bookings")} />
        </label>

        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label={tx("Booking status")}>
          <option value="">{tx("All statuses")}</option>
          <option value="pending">{tx("Pending")}</option>
          <option value="confirmed">{tx("Confirmed")}</option>
          <option value="cancelled">{tx("Cancelled")}</option>
        </select>

        <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} aria-label={tx("Payment status")}>
          <option value="">{tx("All payments")}</option>
          <option value="pending">{tx("Payment pending")}</option>
          <option value="paid">{tx("Paid")}</option>
          <option value="refunded">{tx("Refunded")}</option>
          <option value="failed">{tx("Failed")}</option>
        </select>

        {hasFilters && (
          <button type="button" className="admin-link-btn" onClick={reset}>
            {tx("Clear")}
          </button>
        )}
      </div>

      {notice && <div className="admin-notice" role="status">{notice}</div>}
      {error && <div className="admin-notice error" role="alert">{error}</div>}

      {loading ? (
        <p className="admin-chart-note">{tx("Loading bookings...")}</p>
      ) : result.data.length === 0 ? (
        <div className="voyara-admin-empty">
          <h3>{tx("No bookings match")}</h3>
          <p>{tx("Try a different search or clear the filters.")}</p>
        </div>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{tx("Reference")}</th>
                <th>{tx("Traveler")}</th>
                <th>{tx("Destination")}</th>
                <th>{tx("Check-in")}</th>
                <th>{tx("Status")}</th>
                <th>{tx("Payment")}</th>
                <th className="num">{tx("Total")}</th>
                <th aria-label={tx("Actions")} />
              </tr>
            </thead>
            <tbody>
              {result.data.map((b) => (
                <tr key={b._id} onClick={() => navigate("/trip-confirmation", { state: { booking: b, fromAdmin: true } })}>
                  <td><strong>{b.bookingReference}</strong></td>
                  <td>
                    {b.traveler?.name}
                    <small>{b.traveler?.email}</small>
                  </td>
                  <td>{b.destination?.name || "—"}</td>
                  <td>{day(b.checkIn)}</td>
                  <td><span className={`voyara-status-badge voyara-status-${b.status}`}>{tx(b.status)}</span></td>
                  <td><span className={`admin-pay admin-pay-${b.paymentStatus}`}>{b.paymentStatus}</span></td>
                  <td className="num">{money(b.pricing?.totalAmount)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {b.status !== "cancelled" && (
                      <button type="button" className="admin-row-action" onClick={() => startCancel(b)} title={tx("Cancel this booking")}>
                        <XCircle size={16} /> {tx("Cancel")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.pages > 1 && (
        <div className="admin-pager">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label={tx("Previous page")}><ChevronLeft size={16} /></button>
          <span>{tx("Page {page} of {pages}", { page: result.page || page, pages: result.pages })}</span>
          <button type="button" disabled={page >= result.pages} onClick={() => setPage((p) => p + 1)} aria-label={tx("Next page")}><ChevronRight size={16} /></button>
        </div>
      )}

      {cancelling && (
        <div className="admin-modal-back" role="presentation" onClick={() => !busy && setCancelling(null)}>
          <div className="admin-modal" role="dialog" aria-modal="true" aria-label={tx("Cancel booking")} onClick={(e) => e.stopPropagation()}>
            <h3>{tx("Cancel {ref}?", { ref: cancelling.bookingReference })}</h3>
            <p>{cancelling.traveler?.name} · {tx(cancelling.destination?.name)} · {money(cancelling.pricing?.totalAmount)}. {tx("The room becomes available again and the traveler is emailed if email is set up.")}</p>

            {cancelling.paymentStatus === "paid" ? (
              <label className="admin-check"> <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} /> {tx("Refund the full amount ({amount})", { amount: money(cancelling.pricing?.totalAmount) })} </label>
            ) : (
              <p className="admin-muted">{tx("Nothing was paid, so there is nothing to refund.")}</p>
            )}

            <label className="admin-field">
              {tx("Reason (optional)")}
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder={tx("For example: hotel closed")} />
            </label>

            <div className="admin-modal-actions">
              <button type="button" className="voyara-admin-outline-btn" onClick={() => setCancelling(null)} disabled={busy}>{tx("Keep booking")}</button>
              <button type="button" className="admin-danger-btn" onClick={confirmCancel} disabled={busy}>{busy ? tx("Cancelling...") : tx("Cancel booking")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsManager;
