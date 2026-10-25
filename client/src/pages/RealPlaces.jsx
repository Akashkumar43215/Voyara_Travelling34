import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Navigation,
  Search,
} from "lucide-react";

import { searchRealPlaces } from "../services/api";
import PageHero from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { plural, placeLine } from "../i18n/plural";
import { tg } from "../i18n/runtime";

const RealPlaces = () => {
  const { t: tx } = useLanguage();

  const location = useLocation();
  const navigate = useNavigate();

  const selectedLocation = location.state?.location || null;
  // Results passed from the search page. They are only a starting point: a reload
  // or the Back button restores an old copy, so the page refreshes them below.
  const [realPlaces, setRealPlaces] = useState(location.state?.realPlaces || []);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const latitude = Number(selectedLocation?.latitude);
    const longitude = Number(selectedLocation?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;

    let active = true;
    setRefreshing(true);

    searchRealPlaces({ lat: latitude, lon: longitude })
      .then((res) => {
        if (active && res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setRealPlaces(res.data);
        }
      })
      .catch(() => {
        // Keep showing the places we already have
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, [selectedLocation?.latitude, selectedLocation?.longitude]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlaces, setSelectedPlaces] = useState([]);

  // Filter places by name/address/category
  const filteredPlaces = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return realPlaces;
    }

    return realPlaces.filter((place) => {
      const searchableText = [
        place.name,
        place.address,
        place.city,
        place.state,
        ...(place.categories || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [realPlaces, searchTerm]);

  // Select / unselect tourist place
  const togglePlaceSelection = (place) => {
    setSelectedPlaces((current) => {
      const alreadySelected = current.some(
        (item) => item.placeId === place.placeId
      );

      if (alreadySelected) {
        return current.filter(
          (item) => item.placeId !== place.placeId
        );
      }

      return [...current, place];
    });
  };

  // Continue to accommodation
  const handleContinue = () => {
    if (selectedPlaces.length === 0) {
      return;
    }

    navigate("/stays", {
      state: {
        location: selectedLocation,
        selectedPlaces,
        // keep the dates and guests chosen on the home page
        checkIn: location.state?.checkIn,
        checkOut: location.state?.checkOut,
        rooms: location.state?.rooms,
        adults: location.state?.adults,
        children: location.state?.children,
      },
    });
  };

  // Direct access protection
  if (!selectedLocation) {
    return (
      <div className="real-places-page">
        <div className="real-places-empty">
          <MapPin size={42} />

          <h2>{tx("No destination selected")}</h2>

          <p>
            {tx("Please return to the VOYARA home page and search for a destination first.")}
          </p>

          <button
            className="btn btn-primary"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={17} />
            {tx("Back to Home")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="real-places-page">
      <PageHero
        eyebrow={tx("Real location discovery")}
        icon={<Navigation />}
        title={<>{tx("Explore")} <span>{tx(selectedLocation.city || selectedLocation.name)}</span></>}
        subtitle={
          <>
            <MapPin size={16} />
            {placeLine(tx, selectedLocation.formatted ||
              [selectedLocation.city, selectedLocation.state, selectedLocation.country]
                .filter(Boolean)
                .join(", "))}
          </>
        }
        actions={
          <button className="page-hero-btn" onClick={() => navigate("/")}>
            <ArrowLeft size={17} />
            {tx("Back to Search")}
          </button>
        }
      >
        <div className="page-hero-card real-places-search">
          <Search size={18} />
          <input
            type="text"
            placeholder={tx("Search tourist places...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </PageHero>

      {/* Main content */}
      <section className="section">
        <div className="container">
          <div className="real-places-toolbar">
            <div> <strong>{filteredPlaces.length}</strong> {tx("tourist places found")} {refreshing && (<span className="real-places-refreshing"> {tx("· updating…")}</span>)} </div>

            {selectedPlaces.length > 0 && (
              <div className="real-selected-count"> <Check size={16} /> {tx("{n} selected", { n: selectedPlaces.length })} </div>
            )}
          </div>

          {/* No results */}
          {filteredPlaces.length === 0 && (
            <div className="real-places-empty">
              <Search size={40} />

              <h2>{tx("No tourist places found")}</h2>

              <p>
                {tx("Try another search term or return to the destination search.")}
              </p>
            </div>
          )}

          {/* Places */}
          {filteredPlaces.length > 0 && (
            <div className="real-places-grid">
              {filteredPlaces.map((place, index) => {
                const isSelected =
                  selectedPlaces.some(
                    (item) =>
                      item.placeId === place.placeId
                  );

                return (
                  <article
                    key={
                      place.placeId ||
                      `${place.name}-${index}`
                    }
                    className={`real-place-card ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() =>
                      togglePlaceSelection(place)
                    }
                  >
                    {/* Photo (falls back to an icon tile if missing or broken) */}
                    <div className="real-place-image">
                      <div className="real-place-image-placeholder">
                        <LandmarkIcon />
                      </div>

                      {place.image && (
                        <img
                          src={place.image}
                          alt={place.name}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}

                      {place.curated && (
                        <span className="real-place-featured-badge">
                          {tx("Featured")}
                        </span>
                      )}

                      {isSelected && (
                        <span className="real-place-selected-badge">
                          <Check size={14} />
                          {tx("Selected")}
                        </span>
                      )}
                    </div>

                    <div className="real-place-content">
                      <div className="real-place-location">
                        <MapPin size={14} />

                        {place.city ||
                          selectedLocation.city ||
                          selectedLocation.name}
                      </div>

                      <h3>{tx(place.name)}</h3>

                      {place.address && (
                        <p className="real-place-address">
                          {place.address}
                        </p>
                      )}

                      {place.categories?.length > 0 && (
                        <div className="real-place-tags">
                          {place.categories
                            .slice(0, 3)
                            .map((category) => (
                              <span
                                key={category}
                              >
                                {formatCategory(
                                  category
                                )}
                              </span>
                            ))}
                        </div>
                      )}

                      {place.distance != null && (
                        <div className="real-place-distance">
                          <Navigation size={14} />

                          {formatDistance(
                            place.distance
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        className={`real-place-select-btn ${
                          isSelected
                            ? "selected"
                            : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlaceSelection(place);
                        }}
                      >
                        {isSelected ? (
                          <>
                            <Check size={16} />
                            {tx("Selected")}
                          </>
                        ) : (
                          <>
                            {tx("Select Place")}
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Bottom selection bar */}
      {selectedPlaces.length > 0 && (
        <div className="real-places-selection-bar">
          <div className="container">
            <div>
              <strong>{plural(tx, selectedPlaces.length, "{n} place selected", "{n} places selected")}</strong>

              <span>
                {tx("Continue to find accommodation for your trip.")}
              </span>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleContinue}
            >
              {tx("Continue to Stays")}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple icon placeholder for real external places
const LandmarkIcon = () => (
  <svg
    width="42"
    height="42"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M3 21h18" />
    <path d="M5 21V10" />
    <path d="M19 21V10" />
    <path d="M3 10h18" />
    <path d="M12 3l9 7H3l9-7Z" />
    <path d="M8 14v3" />
    <path d="M12 14v3" />
    <path d="M16 14v3" />
  </svg>
);

const formatCategory = (category) => {
  return category
    .split(".")
    .pop()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
};

const formatDistance = (distance) => {
  if (distance < 1000) {
    return tg("{n} m away", { n: Math.round(distance) });
  }

  return tg("{n} km away", { n: (distance / 1000).toFixed(1) });
};

export default RealPlaces;