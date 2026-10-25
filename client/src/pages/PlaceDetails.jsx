import React, { useEffect, useState } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  Ticket,
  Navigation,
  Tag,
  AlertCircle,
  Hotel,
} from "lucide-react";

import { getPlaceById } from "../services/api";

import FavoriteButton from "../components/FavoriteButton";
import ReviewsSection from "../components/ReviewsSection";
import { useLanguage } from "../context/LanguageContext";

const PlaceDetails = () => {
  const { t: tx } = useLanguage();

  const { placeId } = useParams();

  const navigate = useNavigate();

  const location = useLocation();

  const [place, setPlace] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ======================================================
  // FETCH PLACE DETAILS
  // ======================================================

  useEffect(() => {
    let isMounted = true;

    const fetchPlace = async () => {
      try {
        if (!isMounted) return;

        setLoading(true);
        setError("");
        setPlace(null);

        if (!placeId) {
          throw new Error(tx("Tourist place information is missing."));
        }

        // ==================================================
        // GET STATE FROM URL
        // ==================================================

        const searchParams = new URLSearchParams(location.search);

        const stateSlug =
          searchParams.get("state") || location.state?.stateSlug || "";

        // ==================================================
        // CALL BACKEND
        // ==================================================

        /*
          getPlaceById must accept the state parameter.

          Example:

          GET /api/places/guravayapalem?state=andhra-pradesh
        */

        const response = await getPlaceById(placeId, stateSlug);

        if (!response?.success) {
          throw new Error(response?.message || tx("Failed to load place details."));
        }

        if (!response.data) {
          throw new Error(tx("Place details were not returned by the server."));
        }

        if (!isMounted) return;

        setPlace(response.data);
      } catch (err) {
        console.error("Place Details API Error:", err);

        if (!isMounted) return;

        setError(
          err?.response?.data?.message ||
            err?.message ||
            tx("Failed to load tourist place details."),
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPlace();

    return () => {
      isMounted = false;
    };
  }, [placeId, location.search, location.state]);

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div className="place-details-page">
        <div className="place-details-status">
          <div className="loading-spinner"></div>

          <h2>{tx("Loading Destination...")}</h2>

          <p>{tx("We're preparing the details for this destination.")}</p>
        </div>
      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (error || !place) {
    return (
      <div className="place-details-page">
        <div className="place-details-status error">
          <AlertCircle size={48} />

          <h2>{tx("Destination Not Found")}</h2>

          <p>{error || tx("The requested tourist place could not be found.")}</p>

          <button className="place-back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            {tx("Go Back")}
          </button>
        </div>
      </div>
    );
  }

  // ======================================================
  // MAP URL
  // ======================================================

  const latitude = place.latitude ?? place.lat ?? place.coordinates?.lat;

  const longitude =
    place.longitude ?? place.lon ?? place.lng ?? place.coordinates?.lon;

  const mapUrl =
    latitude != null && longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${place.name || ""}, ${place.city || ""}, ${place.state || ""}`,
        )}`;

  // ======================================================
  // FIND HOTELS NEAR THIS PLACE
  // ======================================================

  const handleFindHotels = () => {
    if (latitude == null || longitude == null) {
      setError(tx("Hotel search requires valid coordinates for this destination."));
      return;
    }

    navigate("/stays", {
      state: {
        location: {
          name: place.name || "",
          formatted:
            place.address ||
            [place.city, place.state, place.country].filter(Boolean).join(", "),

          city: place.city || "",
          state: place.state || "",
          country: place.country || "",

          latitude: Number(latitude),
          longitude: Number(longitude),
        },

        selectedPlaces: [
          {
            ...place,
            id:
              place.id ||
              place._id ||
              place.placeId ||
              place.slug ||
              place.name,
          },
        ],
      },
    });
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="place-details-page">
      {/* ==================================================
          HERO
          ================================================== */}

      <section className="place-details-hero">
        {place.image ? (
          <img
            src={place.image}
            alt={place.imageAlt || place.name || tx("Tourist destination")}
            className="place-details-hero-image"
          />
        ) : (
          <div className="place-details-hero-image place-details-image-fallback">
            <MapPin size={50} />
          </div>
        )}

        <div className="place-details-hero-overlay"></div>

        <button
          className="place-details-back"
          onClick={() => navigate(-1)}
          type="button"
        >
          <ArrowLeft size={18} />
          {tx("Back")}
        </button>

        <FavoriteButton
          className="place-details-favorite"
          item={{
            itemType: "place",
            itemId: placeId,
            name: place.name,
            image: place.image || "",
            city: place.city || "",
            state: place.state || "",
            stateSlug: place.stateSlug || "",
          }}
        />

        <div className="place-details-hero-content">
          <div className="place-details-rating">
            <Star size={16} fill="currentColor" />

            <span>{place.rating || "N/A"}</span>
          </div>

          <h1>{tx(place.name)}</h1>

          <div className="place-details-location">
            <MapPin size={18} />

            <span>
              {place.city || tx("Unknown City")}

              {place.state ? `, ${place.state}` : ""}
            </span>
          </div>
        </div>
      </section>

      {/* ==================================================
          MAIN CONTENT
          ================================================== */}

      <main className="place-details-container">
        <div className="place-details-main">
          {/* ==================================================
              DESCRIPTION
              ================================================== */}

          <section className="place-details-section">
            <div className="place-details-section-label">
              {tx("ABOUT THE DESTINATION")}
            </div>

            <h2>{tx("About {name}", { name: place.name })}</h2>

            <p className="place-details-description">
              {place.description ||
                tx("Explore {name}, a destination in {where}.", { name: place.name, where: place.city || place.state || "India" })}
            </p>
          </section>

          {/* ==================================================
              CATEGORIES
              ================================================== */}

          {Array.isArray(place.categories) && place.categories.length > 0 && (
            <section className="place-details-section">
              <div className="place-details-section-label">{tx("EXPERIENCE")}</div>

              <h2>{tx("What This Place Offers")}</h2>

              <div className="place-details-tags">
                {place.categories.map((category) => (
                  <span key={category} className="place-details-tag">
                    <Tag size={14} />

                    {tx(category)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ==================================================
              LOCATION
              ================================================== */}

          <section className="place-details-section">
            <div className="place-details-section-label">{tx("LOCATION")}</div>

            <h2>{tx("Where Is It?")}</h2>

            <div className="place-address">
              <MapPin size={20} />

              <div>
                <strong>{tx(place.name)}</strong>

                <p>
                  {place.address ||
                    [place.city, place.state, place.country]
                      .filter(Boolean)
                      .join(", ")}
                </p>
              </div>
            </div>

            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="place-map-button"
            >
              <Navigation size={17} />
              {tx("Explore on Google Maps")}
            </a>

            <button
              type="button"
              className="place-hotels-button"
              onClick={handleFindHotels}
            >
              <Hotel size={18} />
              {tx("Find Hotels Near This Place")}
            </button>
          </section>

          {/* ==================================================
              TRAVELER REVIEWS
              ================================================== */}

          <ReviewsSection itemType="place" itemId={placeId} />
        </div>

        {/* ==================================================
            SIDEBAR
            ================================================== */}

        <aside className="place-details-sidebar">
          {/* ==================================================
              VISITOR INFORMATION
              ================================================== */}

          <div className="place-info-card">
            <h3>{tx("Visitor Information")}</h3>

            {/* Rating */}

            <div className="place-info-item">
              <div className="place-info-icon">
                <Star size={18} fill="currentColor" />
              </div>

              <div>
                <span>{tx("Rating")}</span>

                <strong>{place.rating || "N/A"} / 5</strong>
              </div>
            </div>

            {/* Entry Fee */}

            <div className="place-info-item">
              <div className="place-info-icon">
                <Ticket size={18} />
              </div>

              <div>
                <span>{tx("Entry Fee")}</span>

                <strong>{place.entryFee ? tx(place.entryFee) : tx("Information unavailable")}</strong>
              </div>
            </div>

            {/* Timings */}

            <div className="place-info-item">
              <div className="place-info-icon">
                <Clock size={18} />
              </div>

              <div>
                <span>{tx("Opening Hours")}</span>

                <strong>{place.timings ? tx(place.timings) : tx("Information unavailable")}</strong>
              </div>
            </div>

            {/* City */}

            <div className="place-info-item">
              <div className="place-info-icon">
                <MapPin size={18} />
              </div>

              <div>
                <span>{tx("City")}</span>

                <strong>{place.city || "N/A"}</strong>
              </div>
            </div>
          </div>

          {/* ==================================================
              COORDINATES
              ================================================== */}

          {(latitude != null || longitude != null) && (
            <div className="place-info-card">
              <h3>{tx("Location Coordinates")}</h3>

              <div className="place-coordinates">
                <div>
                  <span>{tx("Latitude")}</span>

                  <strong>{latitude ?? "N/A"}</strong>
                </div>

                <div>
                  <span>{tx("Longitude")}</span>

                  <strong>{longitude ?? "N/A"}</strong>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================
              SOURCE
              ================================================== */}

          {place.source && (
            <div className="place-source">
              <small>{tx("Destination information")}</small>

              <strong>{place.source}</strong>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
};

export default PlaceDetails;
