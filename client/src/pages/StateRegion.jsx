import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import {
  Search,
  MapPin,
  Compass,
  ArrowRight,
  X,
  AlertCircle,
  Building2,
} from "lucide-react";

import { getStates } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import { plural } from "../i18n/plural";

const StateRegion = () => {
  const { t: tx } = useLanguage();

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ======================================================
  // INITIAL URL VALUES
  // ======================================================

  const initialSearch = searchParams.get("search") || "";
  const initialRegion = searchParams.get("region") || "All Regions";

  // ======================================================
  // STATE
  // ======================================================

  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState(initialSearch);

  const [selectedRegion, setSelectedRegion] = useState(initialRegion);

  const [selectedType, setSelectedType] = useState("All");

  // ======================================================
  // REGIONS
  // ======================================================

  const regions = [
    "All Regions",
    "North",
    "South",
    "East",
    "West",
    "Central",
    "Northeast",
    "Union Territory",
  ];

  // ======================================================
  // FETCH STATES
  // ======================================================

  useEffect(() => {
    let isMounted = true;

    const fetchStates = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = {};

        // Region filter
        if (selectedRegion !== "All Regions") {
          params.region = selectedRegion;
        }

        // Type filter
        if (selectedType !== "All") {
          params.type = selectedType;
        }

        // Search filter
        if (searchTerm.trim() !== "") {
          params.search = searchTerm.trim();
        }

        const response = await getStates(params);

        if (!isMounted) {
          return;
        }

        if (!response.success) {
          throw new Error(
            response.message || tx("Failed to load Indian destinations"),
          );
        }

        setStates(response.data || []);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        console.error("State API Error:", err);

        setError(
          err.response?.data?.message ||
            err.message ||
            tx("Failed to load Indian destinations"),
        );

        setStates([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStates();

    return () => {
      isMounted = false;
    };
  }, [selectedRegion, selectedType, searchTerm]);

  // ======================================================
  // REGION CHANGE
  // ======================================================

  const handleRegionChange = (region) => {
    setSelectedRegion(region);

    const newParams = new URLSearchParams(searchParams);

    if (region === "All Regions") {
      newParams.delete("region");
    } else {
      newParams.set("region", region);
    }

    setSearchParams(newParams);
  };

  // ======================================================
  // SEARCH CHANGE
  // ======================================================

  const handleSearchChange = (e) => {
    const value = e.target.value;

    setSearchTerm(value);

    const newParams = new URLSearchParams(searchParams);

    if (value.trim()) {
      newParams.set("search", value.trim());
    } else {
      newParams.delete("search");
    }

    setSearchParams(newParams);
  };

  // ======================================================
  // CLEAR FILTERS
  // ======================================================

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedRegion("All Regions");
    setSelectedType("All");
    setSearchParams({});
  };

  // ======================================================
  // EXPLORE STATE
  // ======================================================

  const handleExploreState = (state) => {
    if (!state?.slug) {
      return;
    }

    navigate(`/places/${state.slug}`);
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="state-region-page">
      {/* ==================================================
          HERO
      ================================================== */}

      <section
        className="hero"
        style={{
          padding: "3.5rem 0 2.5rem",
        }}
      >
        <div
          className="container"
          style={{
            textAlign: "center",
          }}
        >
          <div className="hero-badge">
            <Compass size={14} color="#059669" />

            <span>{tx("Complete Indian Travel Directory")}</span>
          </div>

          <h1 className="hero-title" style={{ fontSize: "3rem", marginBottom: "0.75rem", }} > {tx("Explore All")} <span>{tx("36 States & Union Territories")}</span> </h1>

          <p
            className="hero-subtitle"
            style={{
              maxWidth: "720px",
              margin: "0 auto 2rem",
            }}
          >
            {tx("Select an Indian State or Union Territory to discover verified tourist attractions, heritage monuments, and map-linked accommodations.")}
          </p>

          {/* ==================================================
              SEARCH + FILTER
          ================================================== */}

          <div
            className="search-card"
            style={{
              maxWidth: "880px",
              margin: "0 auto",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {/* Search */}
              <div
                className="search-field"
                style={{
                  flex: 1,
                  minWidth: "240px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.65rem 1rem",
                }}
              >
                <Search size={18} color="var(--text-muted)" />

                <input
                  type="text"
                  placeholder={tx("Search by state name, capital, or attractions...")}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontSize: "0.95rem",
                  }}
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");

                      const newParams = new URLSearchParams(searchParams);

                      newParams.delete("search");

                      setSearchParams(newParams);
                    }}
                    style={{
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Type Filter */}
              <div
                className="search-field"
                style={{
                  width: "180px",
                  padding: "0.65rem 0.85rem",
                }}
              >
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontWeight: 600,
                  }}
                >
                  <option value="All">{tx("All Types (36)")}</option>

                  <option value="State">{tx("States (28)")}</option>

                  <option value="Union Territory">{tx("Union Territories (8)")}</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(searchTerm ||
                selectedRegion !== "All Regions" ||
                selectedType !== "All") && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClearFilters}
                  style={{
                    padding: "0.65rem 1rem",
                  }}
                >
                  <X size={14} />
                  {tx("Clear")}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          REGION + DESTINATIONS
      ================================================== */}

      <section className="section">
        <div className="container">
          {/* Region Tabs */}
          <div
            className="region-pills"
            style={{
              justifyContent: "center",
            }}
          >
            {regions.map((region) => (
              <button
                key={region}
                className={`region-pill ${
                  selectedRegion === region ? "active" : ""
                }`}
                onClick={() => handleRegionChange(region)}
              >
                {tx(region)}
              </button>
            ))}
          </div>

          {/* Results Summary */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.75rem",
              paddingBottom: "0.75rem",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", }} > {plural(tx, states.length, "Showing {n} destination", "Showing {n} destinations")} </span>

            <span
              style={{
                fontSize: "0.825rem",
                color: "var(--text-muted)",
              }}
            >
              {tx("Centralized VOYARA MongoDB Database")}
            </span>
          </div>

          {/* Loading */}
          {loading && (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 0",
              }}
            >
              <div
                className="status-dot online"
                style={{
                  width: "16px",
                  height: "16px",
                  margin: "0 auto 1rem",
                }}
              />

              <p
                style={{
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                {tx("Loading Indian destinations...")}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                background: "#fee2e2",
                borderRadius: "12px",
                color: "#991b1b",
                maxWidth: "550px",
                margin: "0 auto",
              }}
            >
              <AlertCircle
                size={32}
                style={{
                  margin: "0 auto 0.5rem",
                }}
              />

              <h3
                style={{
                  marginBottom: "0.5rem",
                }}
              >
                {tx("Failed to Load Destinations")}
              </h3>

              <p
                style={{
                  fontSize: "0.9rem",
                  marginBottom: "1rem",
                }}
              >
                {error}
              </p>

              <button
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                {tx("Retry")}
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && states.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 2rem",
                background: "white",
                borderRadius: "16px",
                border: "1px solid var(--border)",
                maxWidth: "550px",
                margin: "0 auto",
              }}
            >
              <MapPin
                size={40}
                color="var(--text-light)"
                style={{
                  margin: "0 auto 1rem",
                }}
              />

              <h3
                style={{
                  marginBottom: "0.5rem",
                }}
              >
                {tx("No Destinations Found")}
              </h3>

              <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.9rem", }} > {tx("No state or union territory matched your search query \"{q}\" in {region}.", { q: searchTerm, region: selectedRegion })} </p>

              <button className="btn btn-primary" onClick={handleClearFilters}>
                {tx("Reset All Filters")}
              </button>
            </div>
          )}

          {/* ==================================================
              STATE CARDS
          ================================================== */}

          {!loading && !error && states.length > 0 && (
            <div className="card-grid">
              {states.map((state) => (
                <div key={state._id || state.slug} className="card">
                  {/* Image */}
                  <div className="card-media">
                    <img
                      src={
                        state.image &&
                        typeof state.image === "string" &&
                        state.image.trim() !== ""
                          ? state.image
                          : "https://res.cloudinary.com/siqc8mbe/image/upload/f_auto,q_auto,w_700/voyara/places-v2/hawa-mahal"
                      }
                      alt={tx("{name} travel destination", { name: state.name })}
                      loading="lazy"
                      onError={(e) => {
                        const fallback =
                          "https://res.cloudinary.com/siqc8mbe/image/upload/f_auto,q_auto,w_700/voyara/places-v2/hawa-mahal";

                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                        }
                      }}
                    />

                    <span className="card-badge">{tx(state.region)}</span>

                    <span
                      className="card-tag"
                      style={{
                        background:
                          state.type === "Union Territory"
                            ? "#0284c7"
                            : "#d97706",
                      }}
                    >
                      {tx(state.type)}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="card-body">
                    <div className="card-location">
                      <Building2 size={13} />

                      <span>{tx("Capital: {name}", { name: state.capital || "N/A" })}</span>
                    </div>

                    <h3 className="card-title">{tx(state.name)}</h3>

                    <p className="card-desc">{tx(state.description)}</p>

                    {/* Popular Places */}
                    {state.popularPlaces && state.popularPlaces.length > 0 && (
                      <div
                        style={{
                          marginBottom: "1rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.725rem",
                            fontWeight: 700,
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {tx("Popular Attractions:")}
                        </span>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.35rem",
                            marginTop: "0.35rem",
                          }}
                        >
                          {state.popularPlaces
                            .slice(0, 3)
                            .map((place, index) => (
                              <span
                                key={index}
                                style={{
                                  fontSize: "0.725rem",
                                  background: "var(--bg-subtle)",
                                  color: "var(--text-main)",
                                  padding: "0.2rem 0.5rem",
                                  borderRadius: "4px",
                                  border: "1px solid var(--border)",
                                }}
                              >
                                {place}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Card Footer */}
                    <div className="card-footer">
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", }} > {tx("Best:")}{" "} <strong>{state.bestTimeToVisit || tx("Oct–Mar")}</strong> </div>

                      {/* IMPORTANT:
                            State -> Tourist Places */}
                      <button
                        className="btn btn-primary"
                        style={{
                          padding: "0.45rem 0.95rem",
                          fontSize: "0.85rem",
                        }}
                        onClick={() => handleExploreState(state)}
                      >
                        <span>{tx("Explore")}</span>

                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default StateRegion;
