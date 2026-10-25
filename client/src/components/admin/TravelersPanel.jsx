import React, { useEffect, useState } from "react";
import { Search, ShieldCheck, ShieldOff } from "lucide-react";
import { getAdminUsers, setUserRole } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

const money = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);

const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const TravelersPanel = () => {
  const { t: tx } = useLanguage();

  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let alive = true;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await getAdminUsers(q.trim());
        if (alive) setUsers(res.data || []);
      } catch (err) {
        if (alive) setError(err.response?.data?.message || tx("Could not load travelers."));
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);

  const toggle = async (u) => {
    const role = u.role === "admin" ? "user" : "admin";

    if (!window.confirm(`${role === "admin" ? "Make" : "Remove admin from"} ${u.name}?`)) return;

    try {
      setBusyId(u.id);
      setError("");
      const res = await setUserRole(u.id, role);
      setNotice(res.message);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role } : x)));
    } catch (err) {
      setError(err.response?.data?.message || tx("Could not change the role."));
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="voyara-admin-card admin-manager">
      <div className="voyara-admin-card-header">
        <div>
          <span className="voyara-admin-card-label">{tx("TRAVELERS")}</span>
          <h2>{tx("Registered users")}</h2>
          <p>{tx("Most recent 100. Admin changes apply immediately.")}</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx("Search name or email")} maxLength={80} aria-label={tx("Search travelers")} />
        </label>
      </div>

      {notice && <div className="admin-notice" role="status">{notice}</div>}
      {error && <div className="admin-notice error" role="alert">{error}</div>}

      {loading ? (
        <p className="admin-chart-note">{tx("Loading travelers...")}</p>
      ) : users.length === 0 ? (
        <div className="voyara-admin-empty"><h3>{tx("No travelers found")}</h3></div>
      ) : (
        <ul className="admin-users">
          {users.map((u) => {
            const isMe = String(u.id) === String(me?.id);

            return (
              <li key={u.id}>
                <div className="voyara-admin-booking-icon">{initials(u.name)}</div>

                <div className="admin-user-main">
                  <strong>
                    {tx(u.name)} {isMe && <em>{tx("(you)")}</em>}
                  </strong>
                  <span>{u.email}</span>
                </div>

                <div className="admin-user-stat">
                  <strong>{u.bookings}</strong>
                  <span>{tx("trips")}</span>
                </div>

                <div className="admin-user-stat">
                  <strong>{money(u.spent)}</strong>
                  <span>{tx("paid")}</span>
                </div>

                <span className={`admin-role admin-role-${u.role}`}>{u.role}</span>

                <button type="button" className="admin-row-action" disabled={isMe || busyId === u.id} onClick={() => toggle(u)} title={isMe ? tx("You cannot change your own role") : undefined}>
                  {u.role === "admin" ? <><ShieldOff size={15} /> {tx("Remove admin")}</> : <><ShieldCheck size={15} /> {tx("Make admin")}</>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TravelersPanel;
