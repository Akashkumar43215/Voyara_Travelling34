import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { getAdminMessages, markMessageRead } from "../services/api";
import PageHero from "../components/PageHero";
import RevenueChart from "../components/admin/RevenueChart";
import BookingsManager from "../components/admin/BookingsManager";
import TravelersPanel from "../components/admin/TravelersPanel";
import { Shield, RefreshCw, User, Users, Plane, CheckCircle2, IndianRupee, MapPin, Hotel, ChevronRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { plural } from "../i18n/plural";
import { dateLocale } from "../i18n/runtime";

const initials = (name) =>
  String(name || "T")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "T";

const AdminDashboard = () => {
  const { t: tx } = useLanguage();

  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    paidBookings: 0,
    totalRevenue: 0,
    services: null,
  });

  const [bookings, setBookings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    // Wait until the saved login has been checked, or a refresh bounces admins to the login page
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/admin" } });
      return;
    }

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    loadDashboard();
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("voyara_token");

      const [statsResponse, bookingsResponse] = await Promise.all([
        api.get("/admin/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        api.get("/admin/bookings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      if (bookingsResponse.data.success) {
        setBookings(bookingsResponse.data.data || []);
      }

      // messages from the Contact page: a failure here must not hide the rest of the dashboard
      try {
        const inbox = await getAdminMessages();
        setMessages(inbox.data || []);
        setUnreadMessages(inbox.unread || 0);
      } catch (inboxError) {
        console.warn("Could not load messages:", inboxError.message);
      }
    } catch (err) {
      console.error("Admin dashboard error:", err);

      setError(
        err.response?.data?.message || tx("Unable to load admin dashboard."),
      );
    } finally {
      setLoading(false);
    }
  };

  const readMessage = async (id) => {
    try {
      await markMessageRead(id);
      setMessages((list) => list.map((m) => (m._id === id ? { ...m, status: "read" } : m)));
      setUnreadMessages((n) => Math.max(0, n - 1));
    } catch (err) {
      console.warn("Could not mark the message as read:", err.message);
    }
  };

  const destinationData = useMemo(() => {
    const destinationMap = {};

    bookings.forEach((booking) => {
      const destination =
        booking.destination?.name ||
        booking.destination?.city ||
        booking.destination ||
        "Unknown";

      destinationMap[destination] = (destinationMap[destination] || 0) + 1;
    });

    return Object.entries(destinationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [bookings]);

  const maxDestinationCount =
    destinationData.length > 0
      ? Math.max(...destinationData.map((item) => item[1]))
      : 1;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString(dateLocale(), {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "confirmed":
        return "voyara-status-confirmed";

      case "pending":
        return "voyara-status-pending";

      case "cancelled":
        return "voyara-status-cancelled";

      default:
        return "voyara-status-default";
    }
  };

  if (loading) {
    return (
      <div className="voyara-admin-page">
        <div className="voyara-admin-loading">
          <div className="voyara-admin-loader"></div>

          <p>{tx("Preparing your travel command center...")}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="voyara-admin-page">
        <div className="voyara-admin-access-card">
          <div className="voyara-admin-access-icon">🔒</div>

          <h2>{tx("Admin access required")}</h2>

          <p>{tx("Your current account does not have administrator privileges.")}</p>

          <button
            className="voyara-admin-primary-btn"
            onClick={() => navigate("/")}
          >
            {tx("Back to VOYARA")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHero
        compact
        eyebrow={tx("VOYARA ADMINISTRATION")}
        icon={<Shield />}
        title={<>{tx("Travel")} <span>{tx("Command Center")}</span></>}
        subtitle={tx("Monitor travelers, bookings and destination activity from one place.")}
        actions={
          <>
            <button className="page-hero-btn" onClick={loadDashboard}>
              <RefreshCw size={16} />
              {tx("Refresh")}
            </button>
            <span className="page-hero-btn" style={{ cursor: "default" }}>
              <User size={16} />
              {user?.name || tx("Administrator")}
            </span>
          </>
        }
      />

    <div className="voyara-admin-page voyara-admin-body">

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="voyara-admin-alert">
          <span>⚠</span>
          <div>
            <strong>{tx("Dashboard data unavailable")}</strong>
            <p>{error}</p>
          </div>

          <button onClick={loadDashboard}>{tx("Try again")}</button>
        </div>
      )}

      <nav className="admin-tabs" role="tablist" aria-label={tx("Admin sections")}>
        {[["overview", "Overview"], ["bookings", "Bookings"], ["travelers", "Travelers"]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {tx(label)}
            {id === "overview" && unreadMessages > 0 && <span className="admin-tab-dot" aria-label={`${unreadMessages} unread messages`} />}
          </button>
        ))}
      </nav>

      {tab === "bookings" && <BookingsManager onChanged={loadDashboard} />}

      {tab === "travelers" && <TravelersPanel />}

      {tab === "overview" && (
        <>
      {/* =====================================================
          METRIC CARDS
      ===================================================== */}

      <section className="voyara-admin-metrics">
        <AdminMetric
          icon={<Users size={22} />}
          label="Travelers"
          value={stats.totalUsers}
          description={tx("Registered users")}
          accent="green"
        />

        <AdminMetric
          icon={<Plane size={22} />}
          label="Total Trips"
          value={stats.totalBookings}
          description={tx("Bookings created")}
          accent="blue"
        />

        <AdminMetric
          icon={<CheckCircle2 size={22} />}
          label="Confirmed"
          value={stats.confirmedBookings}
          description={tx("Confirmed journeys")}
          accent="gold"
        />

        <AdminMetric
          icon={<IndianRupee size={22} />}
          label="Revenue"
          value={formatCurrency(stats.totalRevenue)}
          description={tx("Paid bookings")}
          accent="purple"
        />
      </section>

      <RevenueChart />

      {/* =====================================================
          MAIN GRID
      ===================================================== */}

      <section className="voyara-admin-dashboard-grid">
        {/* RECENT BOOKINGS */}

        <div className="voyara-admin-card voyara-admin-bookings">
          <div className="voyara-admin-card-header">
            <div>
              <span className="voyara-admin-card-label">{tx("BOOKING ACTIVITY")}</span>

              <h2>{tx("Recent journeys")}</h2>

              <p>{tx("Latest reservations made through VOYARA.")}</p>
            </div>

            <button
              className="voyara-admin-outline-btn"
              onClick={() => navigate("/trips")}
            >
              {tx("View trips →")}
            </button>
          </div>

          {bookings.length === 0 ? (
            <div className="voyara-admin-empty">
              <div className="voyara-admin-empty-icon"><Plane size={24} /></div>

              <h3>{tx("No booking activity yet")}</h3>

              <p>
                {tx("Once travelers make bookings, their journeys will appear here.")}
              </p>
            </div>
          ) : (
            <div className="voyara-admin-booking-list">
              {bookings.slice(0, 6).map((booking) => (
                <div
                  className="voyara-admin-booking-row"
                  key={booking._id}
                  onClick={() =>
                    navigate("/trip-confirmation", {
                      state: {
                        booking,
                        fromAdmin: true,
                      },
                    })
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      navigate("/trip-confirmation", {
                        state: {
                          booking,
                          fromAdmin: true,
                        },
                      });
                    }
                  }}
                >
                  <div className="voyara-admin-booking-icon">{initials(booking.traveler?.name || booking.user?.name)}</div>

                  <div className="voyara-admin-booking-main">
                    <strong>{booking.bookingReference || tx("VOY-BOOKING")}</strong>

                    <span>
                      {booking.traveler?.name ||
                        booking.user?.name ||
                        tx("Traveler")}
                    </span>
                  </div>

                  <div className="voyara-admin-booking-destination">
                    <strong>
                      {booking.destination?.name ||
                        booking.destination?.city ||
                        booking.destination ||
                        tx("Destination")}
                    </strong>

                    <span>{formatDate(booking.checkIn)}</span>
                  </div>

                  <div>
                    <span
                      className={`voyara-status-badge ${getStatusClass(
                        booking.status,
                      )}`}
                    >
                      {booking.status || tx("pending")}
                    </span>
                  </div>

                  <div className="voyara-admin-booking-price">
                    {formatCurrency(booking.pricing?.totalAmount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOOKING HEALTH */}

        <div className="voyara-admin-card">
          <div className="voyara-admin-card-header">
            <div>
              <span className="voyara-admin-card-label">{tx("TRIP STATUS")}</span>

              <h2>{tx("Booking health")}</h2>

              <p>{tx("Current booking distribution.")}</p>
            </div>
          </div>

          {stats.totalBookings > 0 && (
            <div className="voyara-admin-stack" role="img" aria-label={tx("Booking status split")}>
              <span className="confirmed" style={{ flexGrow: stats.confirmedBookings }} />
              <span className="pending" style={{ flexGrow: stats.pendingBookings }} />
              <span className="cancelled" style={{ flexGrow: stats.cancelledBookings }} />
            </div>
          )}

          <div className="voyara-admin-health">
            <HealthRow
              label="Confirmed"
              value={stats.confirmedBookings}
              total={stats.totalBookings}
              type="confirmed"
            />

            <HealthRow
              label="Pending"
              value={stats.pendingBookings}
              total={stats.totalBookings}
              type="pending"
            />

            <HealthRow
              label="Cancelled"
              value={stats.cancelledBookings}
              total={stats.totalBookings}
              type="cancelled"
            />
          </div>

          <div className="voyara-admin-total-box">
            <span>{tx("Total bookings")}</span>

            <strong>{stats.totalBookings}</strong>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECOND ROW
      ===================================================== */}

      <section className="voyara-admin-dashboard-grid second">
        {/* DESTINATIONS */}

        <div className="voyara-admin-card">
          <div className="voyara-admin-card-header">
            <div>
              <span className="voyara-admin-card-label">{tx("DESTINATION PULSE")}</span>

              <h2>{tx("Where travelers go")}</h2>

              <p>{tx("Popular destinations based on bookings.")}</p>
            </div>

            <div className="voyara-admin-card-symbol"><MapPin size={18} /></div>
          </div>

          {destinationData.length === 0 ? (
            <div className="voyara-admin-destination-empty">
              <span><MapPin size={22} /></span>

              <p>{tx("Destination insights will appear after bookings.")}</p>
            </div>
          ) : (
            <div className="voyara-admin-destinations">
              {destinationData.map(([destination, count]) => {
                const width = (count / maxDestinationCount) * 100;

                return (
                  <div className="voyara-admin-destination" key={destination}>
                    <div className="voyara-admin-destination-top">
                      <strong>{destination}</strong>

                      <span>{plural(tx, count, "{n} trip", "{n} trips")}</span>
                    </div>

                    <div className="voyara-admin-progress">
                      <span
                        style={{
                          width: `${width}%`,
                        }}
                      ></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SYSTEM HEALTH */}

        <div className="voyara-admin-card">
          <div className="voyara-admin-card-header">
            <div>
              <span className="voyara-admin-card-label">{tx("SYSTEM")}</span>

              <h2>{tx("VOYARA health")}</h2>

              <p>{tx("Core platform services.")}</p>
            </div>

            <div className="voyara-admin-live"> <span></span> {tx("Live")} </div>
          </div>

          <div className="voyara-admin-system-list">
            <SystemRow
              label="Authentication"
              value="JWT protected"
              status="Active"
            />

            <SystemRow
              label="Booking Engine"
              value="MongoDB connected"
              status="Active"
            />

            <SystemRow label="Payment" value="Demo mode" status="Demo" demo />

            <SystemRow
              label="Cloud Images"
              value="Cloudinary"
              status="Active"
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          SERVICES BOOKED (meals, travel, activities)
      ===================================================== */}

      {stats.services && (
        <section className="voyara-admin-services">
          <div className="voyara-admin-card">
            <div className="voyara-admin-card-header">
              <div>
                <span className="voyara-admin-card-label">{tx("SERVICES")}</span>
                <h2>{tx("What guests add to their stay")}</h2>
              </div>
            </div>

            <div className="voyara-admin-service-grid">
              <div>
                <span>{tx("Meals")}</span>
                <strong>{stats.services.withMeals}</strong>
                <small>{tx("bookings")} · {formatCurrency(stats.services.mealsRevenue)}</small>
                <ul>
                  {stats.services.mealPlans.map((p) => (
                    <li key={p.name}>
                      <em>{tx(p.name)}</em>
                      <b>{p.count}</b>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span>{tx("Local travel")}</span>
                <strong>{stats.services.withTransport}</strong>
                <small>{tx("bookings")} · {formatCurrency(stats.services.transportRevenue)}</small>
                <ul>
                  {stats.services.transportModes.length === 0 && <li><em>{tx("None booked yet")}</em></li>}
                  {stats.services.transportModes.map((t) => (
                    <li key={t.name}>
                      <em>{tx(t.name)}</em>
                      <b>{t.count}</b>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span>{tx("Activities")}</span>
                <strong>{stats.services.withActivities}</strong>
                <small>{tx("bookings")} · {formatCurrency(stats.services.activitiesRevenue)}</small>
                <ul>
                  {stats.services.topActivities.length === 0 && <li><em>{tx("None booked yet")}</em></li>}
                  {stats.services.topActivities.map((a) => (
                    <li key={a.name}>
                      <em>{tx(a.name)}</em>
                      <b>{a.count}</b>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          MESSAGES FROM THE CONTACT PAGE
      ===================================================== */}

      <section className="voyara-admin-services">
        <div className="voyara-admin-card">
          <div className="voyara-admin-card-header">
            <div>
              <span className="voyara-admin-card-label">{tx("MESSAGES")}</span>
              <h2>{tx("From the Contact page")}{unreadMessages > 0 && <span className="admin-unread">{tx("{n} new", { n: unreadMessages })}</span>}</h2>
            </div>
          </div>

          {messages.length === 0 ? (
            <p className="admin-messages-empty">{tx("No messages yet. When a visitor writes from the Contact page it appears here.")}</p>
          ) : (
            <ul className="admin-messages">
              {messages.slice(0, 10).map((m) => (
                <li key={m._id} className={m.status === "new" ? "is-new" : ""}>
                  <div className="admin-message-head">
                    <strong>{m.subject}</strong>
                    <time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time>
                  </div>

                  <p className="admin-message-from">
                    {tx(m.name)} · <a href={`mailto:${m.email}`}>{m.email}</a>
                  </p>

                  <p className="admin-message-body">{m.message}</p>

                  {m.status === "new" && (
                    <button type="button" className="admin-message-read" onClick={() => readMessage(m._id)}>
                      {tx("Mark as read")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* =====================================================
          ADMIN TOOLS
      ===================================================== */}

      <section className="voyara-admin-tools">
        <div>
          <span className="voyara-admin-card-label">{tx("ADMIN TOOLS")}</span>

          <h2>{tx("Manage VOYARA")}</h2>

          <p>{tx("More operational tools can be connected as the platform grows.")}</p>
        </div>

        <div className="voyara-admin-tool-grid">
          <AdminTool
            icon={<Users size={20} />}
            title={tx("Travelers")}
            description={tx("View registered users")}
          />

          <AdminTool
            icon={<MapPin size={20} />}
            title={tx("Destinations")}
            description={tx("Manage travel discovery")}
          />

          <AdminTool
            icon={<Hotel size={20} />}
            title={tx("Stays")}
            description={tx("Manage accommodation data")}
          />
        </div>
      </section>
        </>
      )}
    </div>
    </>
  );
};

/* =========================================================
   COMPONENTS
   ========================================================= */

const AdminMetric = ({ icon, label, value, description, accent }) => {
  const { t: tx } = useLanguage();

  return (
    <div className={`voyara-admin-metric voyara-admin-metric-${accent}`}>
      <div className="voyara-admin-metric-top">
        <div className="voyara-admin-metric-icon">{icon}</div>

        <span className="voyara-admin-metric-dot"></span>
      </div>

      <span className="voyara-admin-metric-label">{tx(label)}</span>

      <strong className="voyara-admin-metric-value">{tx(value)}</strong>

      <span className="voyara-admin-metric-description">{tx(description)}</span>
    </div>
  );
};

const HealthRow = ({ label, value, total, type }) => {
  const { t: tx } = useLanguage();

  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="voyara-health-row">
      <div className="voyara-health-info">
        <div>
          <span className={`voyara-health-dot ${type}`}></span>

          <strong>{tx(label)}</strong>
        </div>

        <span>{tx(value)}</span>
      </div>

      <div className="voyara-health-progress">
        <span
          className={type}
          style={{
            width: `${percentage}%`,
          }}
        ></span>
      </div>
    </div>
  );
};

const SystemRow = ({ label, value, status, demo = false }) => {
  const { t: tx } = useLanguage();

  return (
    <div className="voyara-system-row">
      <div className="voyara-system-left">
        <span className={`voyara-system-status ${demo ? "demo" : ""}`}></span>

        <div>
          <strong>{tx(label)}</strong>

          <span>{tx(value)}</span>
        </div>
      </div>

      <span className={`voyara-system-badge ${demo ? "demo" : ""}`}>
        {tx(status)}
      </span>
    </div>
  );
};

const AdminTool = ({ icon, title, description }) => {
  const { t: tx } = useLanguage();

  return (
    <div className="voyara-admin-tool">
      <div className="voyara-admin-tool-icon">{icon}</div>

      <div>
        <strong>{tx(title)}</strong>

        <p>{tx(description)}</p>
      </div>

      <ChevronRight size={18} className="voyara-admin-tool-arrow" />
    </div>
  );
};

export default AdminDashboard;
