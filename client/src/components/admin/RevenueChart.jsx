import React, { useEffect, useMemo, useState } from "react";
import { getRevenueSeries } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { plural } from "../../i18n/plural";
import { dateLocale } from "../../i18n/runtime";

const money = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);

const compact = (amount) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(amount || 0);

const shortLabel = (label, monthly) => {
  const date = new Date(`${label}${monthly ? "-01" : ""}T00:00:00Z`);

  return date.toLocaleDateString(dateLocale(), monthly ? { month: "short", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });
};

// Plain SVG bars, no chart library. Heights are drawn from a nice round maximum.
const niceMax = (value) => {
  if (value <= 0) return 1000;

  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((m) => m * power >= value);

  return step * power;
};

const W = 720;
const H = 240;
const PAD = { top: 16, right: 12, bottom: 30, left: 46 };

const RevenueChart = () => {
  const { t: tx } = useLanguage();

  const [range, setRange] = useState("30d");
  const [points, setPoints] = useState([]);
  const [state, setState] = useState("loading");
  const [hover, setHover] = useState(null);

  useEffect(() => {
    let alive = true;

    setState("loading");

    getRevenueSeries(range)
      .then((res) => {
        if (!alive) return;
        setPoints(res.data || []);
        setState("ready");
      })
      .catch(() => alive && setState("error"));

    return () => {
      alive = false;
    };
  }, [range]);

  const monthly = range === "12m";
  const total = useMemo(() => points.reduce((sum, p) => sum + p.revenue, 0), [points]);
  const trips = useMemo(() => points.reduce((sum, p) => sum + p.bookings, 0), [points]);
  const max = niceMax(Math.max(0, ...points.map((p) => p.revenue)));

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = points.length ? innerW / points.length : innerW;
  const barW = Math.max(4, slot * 0.62);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = monthly ? 1 : 5;
  const active = hover !== null ? points[hover] : null;

  return (
    <div className="voyara-admin-card admin-revenue">
      <div className="voyara-admin-card-header">
        <div>
          <span className="voyara-admin-card-label">{tx("REVENUE")}</span>
          <h2>{money(total)}</h2>
          <p>{tx(trips === 1 ? "{n} paid booking in the last {period}" : "{n} paid bookings in the last {period}", { n: trips, period: monthly ? tx("12 months") : tx("30 days") })}</p>
        </div>

        <div className="admin-segment" role="tablist" aria-label={tx("Revenue range")}>
          {[["30d", "30 days"], ["12m", "12 months"]].map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={range === value} className={range === value ? "active" : ""} onClick={() => setRange(value)}>
              {tx(label)}
            </button>
          ))}
        </div>
      </div>

      {state === "error" && <p className="admin-chart-note">{tx("Could not load the revenue chart.")}</p>}
      {state === "loading" && <p className="admin-chart-note">{tx("Loading chart...")}</p>}

      {state === "ready" && (
        <div className="admin-chart-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tx(monthly ? "Revenue per month, total {total}" : "Revenue per day, total {total}", { total: money(total) })} className="admin-chart">
            {ticks.map((t) => {
              const y = PAD.top + innerH - t * innerH;

              return (
                <g key={t}>
                  <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} className="admin-chart-grid" />
                  <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="admin-chart-axis">
                    {compact(max * t)}
                  </text>
                </g>
              );
            })}

            {points.map((p, i) => {
              const h = (p.revenue / max) * innerH;
              const x = PAD.left + i * slot + (slot - barW) / 2;

              return (
                <g key={p.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
                  <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={innerH} fill="transparent" />
                  <rect x={x} y={PAD.top + innerH - Math.max(h, p.revenue > 0 ? 2 : 0)} width={barW} height={Math.max(h, p.revenue > 0 ? 2 : 0)} rx="3" className={`admin-chart-bar ${hover === i ? "hover" : ""}`} />
                  <title>{`${shortLabel(p.label, monthly)}: ${money(p.revenue)} (${plural(tx, p.bookings, "{n} booking", "{n} bookings")})`}</title>
                  {i % labelEvery === 0 && (
                    <text x={x + barW / 2} y={H - 10} textAnchor="middle" className="admin-chart-axis">
                      {shortLabel(p.label, monthly)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          <div className="admin-chart-readout" aria-live="polite">
            {active ? (
              <> <strong>{shortLabel(active.label, monthly)}</strong> {money(active.revenue)} · {plural(tx, active.bookings, "{n} booking", "{n} bookings")} </>
            ) : total === 0 ? (
              tx("No paid bookings in this period yet.")
            ) : (
              tx("Hover or focus a bar for details.")
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueChart;
