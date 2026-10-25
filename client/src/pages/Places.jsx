import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";

import { getPlaces, getStates } from "../services/api";
import { Compass } from "lucide-react";
import PageHero from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { plural } from "../i18n/plural";

const Places = () => {
  const { t: tx } = useLanguage();

  const { stateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // =========================================================
  // STATE
  // =========================================================

  const [places, setPlaces] = useState([]);
  const [stateName, setStateName] = useState("");
  const [stateImage, setStateImage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("default");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Multiple place selection
  const [selectedPlaces, setSelectedPlaces] = useState([]);

  // =========================================================
  // GET STATE SLUG
  // =========================================================

  const stateSlug = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);

    return (
      location.state?.stateSlug ||
      stateId ||
      searchParams.get("state") ||
      ""
    )
      .toString()
      .trim()
      .toLowerCase();
  }, [location.state, location.search, stateId]);

  // =========================================================
  // CREATE SAFE SLUG
  // =========================================================

  const createPlaceSlug = (place) => {
    const existingSlug =
      typeof place?.slug === "string" ? place.slug.trim() : "";

    if (existingSlug) {
      return existingSlug.toLowerCase();
    }

    const name =
      typeof place?.name === "string" ? place.name.trim() : "";

    if (!name) {
      return "";
    }

    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // =========================================================
  // MULTI-PLACE SELECTION
  // =========================================================

  const togglePlaceSelection = (place) => {
    const placeSlug = createPlaceSlug(place);

    if (!placeSlug) {
      return;
    }

    setSelectedPlaces((current) => {
      const alreadySelected = current.some(
        (item) => createPlaceSlug(item) === placeSlug
      );

      if (alreadySelected) {
        return current.filter(
          (item) => createPlaceSlug(item) !== placeSlug
        );
      }

      return [...current, place];
    });
  };

  // =========================================================
  // FETCH TOURIST PLACES
  // =========================================================

  useEffect(() => {
    let isMounted = true;

    const fetchPlaces = async () => {
      try {
        if (!isMounted) return;

        setLoading(true);
        setError("");
        setPlaces([]);
        setStateImage("");

        if (!stateSlug) {
          throw new Error(tx("State information is missing."));
        }

        // =====================================================
        // STEP 1 — RESOLVE SLUG TO REAL STATE
        // =====================================================

        let resolvedStateName = stateSlug
          .split("-")
          .filter(Boolean)
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1)
          )
          .join(" ");

        try {
          const statesResponse = await getStates();

          if (statesResponse?.success) {
            const states = statesResponse.data || [];

            const matchedState = states.find(
              (state) =>
                state?.slug?.toLowerCase() === stateSlug.toLowerCase()
            );

            if (matchedState) {
              if (matchedState.name) {
                resolvedStateName = matchedState.name;
              }

              if (matchedState.image) {
                setStateImage(matchedState.image);
              }
            }
          }
        } catch (stateError) {
          console.warn(
            "State lookup failed. Using slug fallback:",
            stateError
          );
        }

        if (!isMounted) return;

        setStateName(resolvedStateName);

        // =====================================================
        // STEP 2 — FETCH CURATED / BACKEND PLACES
        // =====================================================

        let response = await getPlaces({
          state: resolvedStateName,
        });

        if (!response?.success) {
          throw new Error(
            response?.message || tx("Failed to load places.")
          );
        }

        let loadedPlaces =
          response.places ||
          response.data ||
          [];

        // =====================================================
        // STEP 3 — SAFE SLUG FALLBACK
        // =====================================================

        if (
          loadedPlaces.length === 0 &&
          stateSlug.toLowerCase() !==
            resolvedStateName.toLowerCase()
        ) {
          try {
            const slugResponse = await getPlaces({
              state: stateSlug,
            });

            if (slugResponse?.success) {
              const slugPlaces =
                slugResponse.places ||
                slugResponse.data ||
                [];

              if (slugPlaces.length > 0) {
                response = slugResponse;
                loadedPlaces = slugPlaces;
              }
            }
          } catch (slugError) {
            console.warn(
              "Slug based places lookup failed:",
              slugError
            );
          }
        }

        // =====================================================
        // STEP 4 — NORMALIZE PLACES
        // =====================================================

        const normalizedPlaces = loadedPlaces.map((place) => ({
          ...place,

          slug: createPlaceSlug(place),

          stateSlug:
            place?.stateSlug ||
            stateSlug,

          state:
            place?.state ||
            resolvedStateName,

          categories: Array.isArray(place?.categories)
            ? place.categories
            : [],

          rating:
            typeof place?.rating === "number"
              ? place.rating
              : Number(place?.rating) || 0,
        }));

        if (!isMounted) return;

        setPlaces(normalizedPlaces);

        // Backend state name has priority
        if (response?.state) {
          setStateName(response.state);
        }
      } catch (err) {
        console.error("Places API Error:", err);

        if (!isMounted) return;

        setPlaces([]);

        setError(
          err?.response?.data?.message ||
            err?.message ||
            tx("Failed to load tourist places.")
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPlaces();

    return () => {
      isMounted = false;
    };
  }, [stateSlug]);

  // =========================================================
  // CREATE UNIQUE CATEGORY LIST
  // =========================================================

  const categories = useMemo(() => {
    const allCategories = places.flatMap((place) =>
      Array.isArray(place.categories)
        ? place.categories
        : []
    );

    return ["all", ...new Set(allCategories)];
  }, [places]);

  // =========================================================
  // SEARCH + CATEGORY + SORT
  // =========================================================

  const filteredPlaces = useMemo(() => {
    let result = [...places];

    // Search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();

      result = result.filter((place) => {
        return (
          place.name?.toLowerCase().includes(search) ||
          place.city?.toLowerCase().includes(search) ||
          place.description?.toLowerCase().includes(search)
        );
      });
    }

    // Category
    if (category !== "all") {
      result = result.filter((place) =>
        place.categories?.includes(category)
      );
    }

    // Rating high to low
    if (sortBy === "rating-high") {
      result.sort(
        (a, b) =>
          (Number(b.rating) || 0) -
          (Number(a.rating) || 0)
      );
    }

    // Rating low to high
    if (sortBy === "rating-low") {
      result.sort(
        (a, b) =>
          (Number(a.rating) || 0) -
          (Number(b.rating) || 0)
      );
    }

    // Name
    if (sortBy === "name") {
      result.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
    }

    return result;
  }, [places, searchTerm, category, sortBy]);

  // =========================================================
  // OPEN PLACE DETAILS
  // =========================================================

  const openPlaceDetails = (place) => {
    const placeSlug = createPlaceSlug(place);

    if (!placeSlug) {
      console.error(
        "Cannot open place details because place has no slug/name:",
        place
      );

      return;
    }

    /*
      IMPORTANT:
      Always send state information with the details URL.

      Example:
      /place/cbilakaluripet-flyover?state=andhra-pradesh

      This is important for Geoapify/fallback places which
      may not exist as curated TouristPlace documents.
    */

    const detailStateSlug =
      place?.stateSlug ||
      stateSlug ||
      "";

    const searchParams = new URLSearchParams();

    if (detailStateSlug) {
      searchParams.set(
        "state",
        detailStateSlug.toLowerCase()
      );
    }

    const search = searchParams.toString();

    navigate(
      {
        pathname: `/place/${encodeURIComponent(placeSlug)}`,
        search: search ? `?${search}` : "",
      },
      {
        state: {
          stateSlug: detailStateSlug,
          placeSlug,
          place,
        },
      }
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="places-page">
        <div className="places-status">
          <div className="loading-spinner"></div>

          <h2>{tx("Discovering amazing places...")}</h2>

          <p>
            {tx("Please wait while we load destinations.")}
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="places-page">
        <div className="places-status error">
          <h2>{tx("Unable to Load Destinations")}</h2>

          <p>{error}</p>

          <button
            onClick={() => window.location.reload()}
          >
            {tx("Try Again")}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="places-page">

      {/* =====================================================
          HERO
          ===================================================== */}

      <PageHero
        eyebrow={tx("Explore India")}
        icon={<Compass />}
        title={<>{tx("Discover")} <span>{stateName}</span></>}
        subtitle={tx("Explore beautiful tourist destinations, heritage sites, landmarks and unforgettable experiences.")}
      />

      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <section className="places-container">

        {/* Heading */}

        <div className="places-heading">
          <div>
            <span className="section-label">
              {tx("DESTINATIONS")}
            </span>

            <h2>{tx("Places to Visit in {state}", { state: stateName })}</h2>

            <p>{plural(tx, filteredPlaces.length, "{n} destination found", "{n} destinations found")}</p>
          </div>
        </div>

        {/* ===================================================
            CONTROLS
            =================================================== */}

        <div className="places-controls">

          {/* Search */}

          <div className="places-search">
            <span>🔍</span>

            <input
              type="text"
              placeholder={tx("Search places, cities...")}
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />
          </div>

          {/* Category */}

          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
          >
            {categories.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item === "all"
                  ? tx("All Categories")
                  : tx(item.charAt(0).toUpperCase() +
                    item.slice(1))}
              </option>
            ))}
          </select>

          {/* Sort */}

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value)
            }
          >
            <option value="default">
              {tx("Sort By")}
            </option>

            <option value="rating-high">
              {tx("Rating: High to Low")}
            </option>

            <option value="rating-low">
              {tx("Rating: Low to High")}
            </option>

            <option value="name">
              {tx("Name: A to Z")}
            </option>
          </select>
        </div>

        {/* ===================================================
            NO RESULTS
            =================================================== */}

        {filteredPlaces.length === 0 ? (
          <div className="places-status">
            <h2>{tx("No destinations found")}</h2>

            <p>
              {tx("Try changing your search or category filter.")}
            </p>
          </div>
        ) : (
          <>
            {/* =================================================
                SELECTED PLACES SUMMARY
                ================================================= */}

            {selectedPlaces.length > 0 && (
              <div className="selected-places-summary"> <strong>{selectedPlaces.length}</strong>{" "}{tx(selectedPlaces.length === 1 ? "place selected" : "places selected")} </div>
            )}

            {/* =================================================
                PLACES GRID
                ================================================= */}

            <div className="places-grid">
              {filteredPlaces.map((place) => {
                const placeSlug =
                  createPlaceSlug(place);

                const isSelected =
                  selectedPlaces.some(
                    (item) =>
                      createPlaceSlug(item) ===
                      placeSlug
                  );

                // =================================================
                // IMAGE
                // =================================================

                const imageSrc =
                  place.image ||
                  stateImage ||
                  "";

                return (
                  <article
                    className={`place-card ${
                      isSelected ? "selected" : ""
                    }`}
                    key={
                      place._id ||
                      place.id ||
                      placeSlug
                    }
                    onClick={() =>
                      togglePlaceSelection(place)
                    }
                  >

                    {/* ===============================
                        IMAGE
                        =============================== */}

                    <div className="place-image-wrapper">

                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={
                            place.imageAlt ||
                            place.name ||
                            tx("Tourist destination")
                          }
                          className="place-image"
                          onError={(event) => {
                            if (
                              stateImage &&
                              event.currentTarget.src !==
                                stateImage
                            ) {
                              event.currentTarget.src =
                                stateImage;
                            }
                          }}
                        />
                      ) : (
                        <div className="place-image-fallback">
                          <span>📍</span>
                          <span>
                            {stateName}
                          </span>
                        </div>
                      )}

                      {/* Rating */}

                      <span className="place-rating">
                        ⭐ {place.rating || 0}
                      </span>

                      {/* Selected */}

                      {isSelected && (
                        <span className="place-selected-badge">
                          {tx("✓ Selected")}
                        </span>
                      )}
                    </div>

                    {/* ===============================
                        CONTENT
                        =============================== */}

                    <div className="place-content">

                      {/* Location */}

                      <div className="place-location">
                        📍{" "}
                        {place.city ||
                          tx("Unknown City")}
                        {place.state
                          ? `, ${place.state}`
                          : ""}
                      </div>

                      {/* Name */}

                      <h3>
                        {tx(place.name)}
                      </h3>

                      {/* Description */}

                      <p className="place-description">
                        {place.description ||
                          tx("Explore this beautiful destination in India.")}
                      </p>

                      {/* Categories */}

                      <div className="place-categories">
                        {place.categories
                          ?.slice(0, 3)
                          .map((item) => (
                            <span key={item}>
                              {tx(item)}
                            </span>
                          ))}
                      </div>

                      {/* =============================
                          DETAILS
                          ============================= */}

                      <div className="place-details">

                        <div>
                          <small>
                            {tx("Entry Fee")}
                          </small>

                          <strong>
                            {place.entryFee ? tx(place.entryFee) : tx("Free / Nominal")}
                          </strong>
                        </div>

                        <div>
                          <small>
                            {tx("Timings")}
                          </small>

                          <strong>
                            {place.timings ? tx(place.timings) : tx("9:00 AM – 5:30 PM")}
                          </strong>
                        </div>

                      </div>

                      {/* =============================
                          VIEW DETAILS
                          ============================= */}

                      <button
                        type="button"
                        className="view-place-btn"
                        onClick={(event) => {
                          event.stopPropagation();

                          openPlaceDetails(place);
                        }}
                      >
                        {tx("View Details →")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* =================================================
                CONTINUE WITH SELECTED PLACES
                ================================================= */}

            {selectedPlaces.length > 0 && (
              <div className="selected-places-action">
                <button
                  type="button"
                  className="continue-places-btn"
                  onClick={() => {
                    navigate("/stays", {
                      state: {
                        stateSlug,
                        selectedPlaces,
                      },
                    });
                  }}
                >
                  {tx("Continue with Selected Places →")}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default Places;