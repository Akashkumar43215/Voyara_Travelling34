import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import {
  Search,
  Calendar,
  Users,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass,
  CheckCircle2,
  Clock,
  Star,
  Hotel,
  ChevronDown,
  Plus,
  Minus,
  Navigation,
  Landmark,
  Trees,
  Check,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Heart,
} from "lucide-react";
import {
  checkApiHealth,
  searchLocations,
  searchRealPlaces,
  getStates,
} from "../services/api";
import HeroSlides from "../components/HeroSlides";
import FeaturedSlider from "../components/FeaturedSlider";
import CountUp from "../components/CountUp";
import { pickBySlug, prefersReducedMotion, wideImage } from "../utils/motion";
import { plural } from "../i18n/plural";

const Home = () => {
  const { t: tx } = useLanguage();

  const navigate = useNavigate();
  const { t } = useLanguage();

  // Calculate default dates (Check-in = tomorrow, Check-out = 3 days later)
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const checkoutDefault = new Date();
  checkoutDefault.setDate(checkoutDefault.getDate() + 4);
  const checkoutDefaultStr = checkoutDefault.toISOString().split("T")[0];

  // Search form state
  const [selectedState, setSelectedState] = useState("");

  // Real location search state
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [checkInDate, setCheckInDate] = useState(tomorrowStr);
  const [checkOutDate, setCheckOutDate] = useState(checkoutDefaultStr);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [guestPickerOpen, setGuestPickerOpen] = useState(false);

  // Selected region filter on Home
  const [activeRegion, setActiveRegion] = useState("All Regions");
  const [showAllStates, setShowAllStates] = useState(false);

  // Backend API & Database connection status
  const [apiStatus, setApiStatus] = useState({
    checking: true,
    online: false,
    message: "Connecting to VOYARA API...",
    database: null,
  });

  // AI assistant preview state
  const [aiTip, setAiTip] = useState(null);

  // State/UT data from MongoDB
  // Home and StateRegion use the same API source,
  // so both pages always display the exact same Cloudinary image.
  const topDestRef = useRef(null);
  const scrollTopDest = (direction) => {
    const row = topDestRef.current;
    if (row) row.scrollBy({ left: direction * row.clientWidth * 0.8, behavior: "smooth" });
  };

  const [homeStates, setHomeStates] = useState([]);

  // Photos for the hero slideshow and the featured slider come from the same states the rest of the site uses
  const heroStates = useMemo(
    () => pickBySlug(homeStates, ["jammu-and-kashmir", "kerala", "rajasthan", "ladakh", "goa"], 5),
    [homeStates]
  );

  const featuredStates = useMemo(
    () =>
      pickBySlug(
        homeStates.filter((st) => !heroStates.includes(st)),
        ["odisha", "himachal-pradesh", "meghalaya", "tamil-nadu", "uttarakhand", "sikkim"],
        6
      ),
    [homeStates, heroStates]
  );

  const heroSlides = useMemo(
    () => [
      {
        image: "https://res.cloudinary.com/siqc8mbe/image/upload/f_auto,q_auto,w_1920/voyara/hero/home",
        name: "Incredible India",
      },
      ...heroStates.map((st) => ({ image: wideImage(st.image, 1920), name: st.name, slug: st.slug })),
    ],
    [heroStates]
  );
  // The Top Destinations row drifts along by itself until the visitor touches it
  useEffect(() => {
    const row = topDestRef.current;
    if (!row || prefersReducedMotion()) return undefined;

    let hold = false;
    let resume = 0;

    const pause = () => {
      hold = true;
      clearTimeout(resume);
      resume = setTimeout(() => { hold = false; }, 6000);
    };

    const id = setInterval(() => {
      if (hold || document.hidden) return;

      const box = row.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return; // not on screen

      const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 8;
      if (atEnd) row.scrollTo({ left: 0, behavior: "smooth" });
      else row.scrollBy({ left: row.clientWidth * 0.45, behavior: "smooth" });
    }, 3800);

    row.addEventListener("pointerdown", pause);
    row.addEventListener("wheel", pause, { passive: true });
    row.addEventListener("mouseenter", pause);

    return () => {
      clearInterval(id);
      clearTimeout(resume);
      row.removeEventListener("pointerdown", pause);
      row.removeEventListener("wheel", pause);
      row.removeEventListener("mouseenter", pause);
    };
  }, [homeStates.length]);

  const [homeStatesLoading, setHomeStatesLoading] = useState(true);
  const [homeStatesError, setHomeStatesError] = useState("");

  // Load all 36 States & UTs from the same backend endpoint
  // used by StateRegion.jsx.
  useEffect(() => {
    let isMounted = true;

    const fetchHomeStates = async () => {
      try {
        setHomeStatesLoading(true);
        setHomeStatesError("");

        const response = await getStates();

        if (!response?.success) {
          throw new Error(
            response?.message || tx("Failed to load Indian destinations.")
          );
        }

        if (isMounted) {
          setHomeStates(
            Array.isArray(response.data) ? response.data : []
          );
        }
      } catch (error) {
        console.error("Home States API Error:", error);

        if (isMounted) {
          setHomeStates([]);
          setHomeStatesError(
            error?.response?.data?.message ||
              error?.message ||
              tx("Failed to load Indian destinations.")
          );
        }
      } finally {
        if (isMounted) {
          setHomeStatesLoading(false);
        }
      }
    };

    fetchHomeStates();

    return () => {
      isMounted = false;
    };
  }, []);

  // Check backend health on mount
  useEffect(() => {
    let isMounted = true;
    checkApiHealth()
      .then((data) => {
        if (isMounted) {
          setApiStatus({
            checking: false,
            online: data.success,
            message: data.message || tx("API Connected"),
            database: data.database || null,
          });
        }
      })
      .catch((err) => {
        if (isMounted) {
          setApiStatus({
            checking: false,
            online: false,
            message: "API Offline — Start server on port 5000",
            database: null,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Real city/location autocomplete
  useEffect(() => {
    const query = selectedState.trim();

    // Don't search when the input is too short
    if (query.length < 2) {
      setLocationSuggestions([]);
      setLocationError("");
      setLocationSearching(false);
      return;
    }

    // If user has already selected a location,
    // don't immediately search again.
    if (selectedLocation && selectedLocation.name === query) {
      return;
    }

    setLocationSearching(true);
    setLocationError("");

    const timer = setTimeout(async () => {
      try {
        const response = await searchLocations({
          text: query,
          type: "city",
          limit: 8,
        });

        if (response.success) {
          setLocationSuggestions(response.data || []);
        } else {
          setLocationSuggestions([]);
          setLocationError(response.message || tx("Location search failed."));
        }
      } catch (error) {
        console.error("Location Search Error:", error);

        setLocationSuggestions([]);
        setLocationError(tx("Unable to search locations right now."));
      } finally {
        setLocationSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedState, selectedLocation]);

  // Handle Check-in date change and enforce Check-out > Check-in
  const handleCheckInChange = (e) => {
    const newCheckIn = e.target.value;
    setCheckInDate(newCheckIn);
    if (newCheckIn >= checkOutDate) {
      const nextDay = new Date(newCheckIn);
      nextDay.setDate(nextDay.getDate() + 2);
      setCheckOutDate(nextDay.toISOString().split("T")[0]);
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();

    if (!selectedLocation) {
      setLocationError(tx("Please select a destination from the suggestions."));
      return;
    }

    try {
      setLocationError("");

      const placesResponse = await searchRealPlaces({
        lat: selectedLocation.latitude,
        lon: selectedLocation.longitude,
        radius: 15000,
        limit: 30,
      });

      if (!placesResponse.success) {
        setLocationError(
          placesResponse.message || tx("Unable to find tourist places."),
        );
        return;
      }

      navigate("/real-places", {
        state: {
          location: selectedLocation,
          realPlaces: placesResponse.data || [],
          checkIn: checkInDate,
          checkOut: checkOutDate,
          rooms,
          adults,
          children,
        },
      });
    } catch (error) {
      console.error("Real Destination Search Error:", error);

      setLocationError(tx("Unable to load tourist places. Please try again."));
    }
  };

  // ======================================================
  // HOME DESTINATIONS
  // ======================================================
  // IMPORTANT:
  // No image URLs are maintained here.
  // state.image comes directly from MongoDB/Cloudinary and
  // is therefore identical to the image used by StateRegion.jsx.
  const destinationsData = homeStates.map((state) => ({
    id: state.slug || state._id,
    slug: state.slug || state._id,
    name: state.name,
    region: state.region || "India",
    type: state.type || "State",
    capital: state.capital || "N/A",
    places:
      Array.isArray(state.popularPlaces) &&
      state.popularPlaces.length > 0
        ? state.popularPlaces.slice(0, 3).join(", ")
        : "Explore verified tourist attractions",
    image: state.image || "",
    tag:
      state.type === "Union Territory"
        ? "Union Territory"
        : "Indian State",
  }));

  // Filtered destinations based on active region tab
  const filteredDestinations =
    activeRegion === "All Regions"
      ? destinationsData
      : destinationsData.filter((d) => d.region === activeRegion);

  // Featured Curated Tourist Places
  const featuredPlaces = [
    {
      id: "p1",
      name: "Hawa Mahal (Palace of Winds)",
      state: "Rajasthan",
      city: "Jaipur",
      category: "Heritage & Monument",
      image:
        "https://res.cloudinary.com/siqc8mbe/image/upload/f_auto,q_auto,w_700/voyara/places-v2/hawa-mahal",
      description:
        "Iconic five-story pink sandstone palace built in 1799 with 953 intricately carved jharokhas.",
    },
    {
      id: "p2",
      name: "Konark Sun Temple",
      state: "Odisha",
      city: "Puri",
      category: "UNESCO World Heritage",
      image:
        "https://res.cloudinary.com/siqc8mbe/image/upload/f_auto,q_auto,w_700/voyara/places-v2/konark-sun-temple",
      description:
        "13th-century chariot temple dedicated to the Sun God Surya, featuring 24 elaborately sculpted wheels.",
    },
    {
      id: "p3",
      name: "Alleppey Backwaters & Canals",
      state: "Kerala",
      city: "Alappuzha",
      category: "Natural Wonder",
      image:
        "https://res.cloudinary.com/siqc8mbe/image/upload/f_auto,q_auto,w_700/voyara/places-v2/alleppey-backwaters",
      description:
        "Tranquil network of interconnected canals, lagoons, and paddy fields fringed with coconut palms.",
    },
    {
      id: "p4",
      name: "Pangong Tso High Altitude Lake",
      state: "Ladakh",
      city: "Leh",
      category: "Alpine Lake & Nature",
      image:
        "https://res.cloudinary.com/siqc8mbe/image/upload/f_auto,q_auto,w_700/voyara/places-v2/pangong-tso",
      description:
        "Endorheic lake situated at 4,350 meters altitude, famous for shifting shades of blue and turquoise.",
    },
  ];

  // Featured Demo Accommodations (clearly tagged as VOYARA Demo Inventory)
  const featuredStays = [
    {
      id: "s1",
      name: "The Royal Haveli Heritage Stay",
      location: "Jaipur, Rajasthan",
      type: "Heritage Hotel",
      price: "₹4,500",
      rating: 4.8,
      amenities: [
        "Heritage Courtyard",
        "Rajasthani Dining",
        "Free WiFi",
        "Pool",
      ],
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80",
    },
    {
      id: "s2",
      name: "Coconut Lagoon Backwater Eco-Resort",
      location: "Kumarakom, Kerala",
      type: "Eco Resort",
      price: "₹5,800",
      rating: 4.9,
      amenities: [
        "Ayurvedic Spa",
        "Canal Cruise",
        "Organic Dining",
        "Lake View",
      ],
      image:
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=700&q=80",
    },
    {
      id: "s3",
      name: "Blue Azure Beachside Luxury Villa",
      location: "Calangute, Goa",
      type: "Luxury Villa",
      price: "₹6,200",
      rating: 4.7,
      amenities: [
        "Private Pool",
        "Beach Access",
        "Modular Kitchen",
        "Barbecue",
      ],
      image:
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=700&q=80",
    },
    {
      id: "s4",
      name: "Himalayan Pine Nature Retreat",
      location: "Manali, Himachal Pradesh",
      type: "Nature Stay",
      price: "₹3,800",
      rating: 4.8,
      amenities: [
        "Mountain View Balcony",
        "Bonfire",
        "Valley Trek Guide",
        "Heater",
      ],
      image:
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80",
    },
  ];

  // AI prompt chip click handler
  const handleAiPromptClick = (prompt) => {
    if (prompt.includes("Rajasthan")) {
      setAiTip({
        title: "Rajasthan 4-Day Suggested Route",
        body: "Day 1-2: Jaipur (Amber Fort, Hawa Mahal, City Palace). Day 3: Jodhpur (Mehrangarh Fort). Day 4: Udaipur (Lake Pichola). Best season: October to March.",
      });
    } else if (prompt.includes("Odisha")) {
      setAiTip({
        title: "Odisha 3-Day Golden Triangle",
        body: "Day 1: Bhubaneswar (Lingaraj Temple & Caves). Day 2: Konark Sun Temple & Chandrabhaga Beach. Day 3: Puri Jagannath Temple & Chilika Lake boating.",
      });
    } else if (prompt.includes("Kerala")) {
      setAiTip({
        title: "Kerala 5-Day Tropical Circuit",
        body: "Day 1-2: Munnar tea plantations and waterfalls. Day 3: Thekkady spice garden & Periyar sanctuary. Day 4-5: Alleppey houseboat backwater cruise.",
      });
    } else if (prompt.includes("pack")) {
      setAiTip({
        title: "Ladakh High-Altitude Packing Checklist",
        body: "Thermal innerwear, fleece windbreaker, UV sunglasses, SPF 50 sunscreen, hydration salts, and portable oxygen canister for Khardung La.",
      });
    } else {
      setAiTip({
        title: "AI Travel Recommendation",
        body: "Select any of the 36 Indian States or Union Territories above to view curated heritage landmarks and geographically verified stays.",
      });
    }
  };

  return (
    <div className="home-page">
      {/* Only shown when the server cannot be reached */}
      {!apiStatus.checking && !apiStatus.online && (
      <div className="api-health-bar">
        <div className="container api-health-content">
          <div className="api-health-tag">
            <span
              className={`status-dot ${apiStatus.online ? "online" : "offline"}`}
            />
            <span>
              REST API: <strong>{apiStatus.message}</strong>
              {apiStatus.database && (
                <span style={{ marginLeft: "0.85rem" }}>
                  • MongoDB:{" "}
                  <strong
                    style={{
                      color:
                        apiStatus.database.status === "connected"
                          ? "#059669"
                          : "#d97706",
                    }}
                  >
                    {apiStatus.database.name} ({tx(apiStatus.database.status)})
                  </strong>
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
      )}

      {/* 1. Hero Section */}
      <section
        className="hero hero-photo has-slides"
        style={{
          "--hero-image":
            "url(https://res.cloudinary.com/siqc8mbe/image/upload/f_auto,q_auto,w_1920/voyara/hero/home)",
        }}
      >
        <HeroSlides slides={heroSlides} onExplore={(slug) => navigate(`/places/${slug}`)} />

        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={14} color="#d97706" />
              <span>{t("home.badge")}</span>
            </div>

            <h1 className="hero-title">
              {t("home.title1")} <span>{t("home.title2")}</span>
            </h1>

            <p className="hero-subtitle">
              {t("home.subtitle")}
            </p>

            {/* Quick tabs (MakeMyTrip-style) */}
            <div className="mmt-tabs" role="tablist">
              <button type="button" className="mmt-tab active" role="tab" aria-selected="true">
                <Hotel size={22} />
                <span>{t("home.tabStays")}</span>
              </button>
              <button type="button" className="mmt-tab" role="tab" onClick={() => navigate("/state-region")}>
                <Compass size={22} />
                <span>{t("home.tabDestinations")}</span>
              </button>
              <button type="button" className="mmt-tab" role="tab" onClick={() => navigate("/trips")}>
                <Briefcase size={22} />
                <span>{t("home.tabTrips")}</span>
              </button>
              <button type="button" className="mmt-tab" role="tab" onClick={() => navigate("/favorites")}>
                <Heart size={22} />
                <span>{t("home.tabFavorites")}</span>
              </button>
            </div>

            {/* Travel Search Card */}
            <div className="search-card">
              <form onSubmit={handleSearchSubmit}>
                <div className="search-grid">
                  {/* Destination / State Input */}
                  <div
                    className="search-field"
                    style={{
                      position: "relative",
                    }}
                  >
                    <label>
                      <MapPin size={14} /> {t("home.where")}
                    </label>

                    <input
                      type="text"
                      placeholder={t("home.wherePlaceholder")}
                      value={selectedState}
                      onChange={(e) => {
                        setSelectedState(e.target.value);
                        setSelectedLocation(null);
                      }}
                      autoComplete="off"
                    />

                    {/* Loading indicator */}
                    {locationSearching && (
                      <div
                        style={{
                          position: "absolute",
                          right: "14px",
                          bottom: "13px",
                          fontSize: "12px",
                          color: "var(--text-muted)",
                        }}
                      >
                        {tx("Searching...")}
                      </div>
                    )}

                    {/* Location suggestions */}
                    {locationSuggestions.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          marginTop: "6px",
                          background: "white",
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                          overflow: "hidden",
                          zIndex: 1000,
                        }}
                      >
                        {locationSuggestions.map((location, index) => (
                          <button
                            key={
                              location.place_id || `${location.name}-${index}`
                            }
                            type="button"
                            style={{
                              width: "100%",
                              padding: "12px 14px",
                              border: "none",
                              borderBottom:
                                index !== locationSuggestions.length - 1
                                  ? "1px solid var(--border)"
                                  : "none",
                              background: "white",
                              textAlign: "left",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "var(--bg-subtle)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "white";
                            }}
                            onClick={() => {
                              const locationData = {
                                name: location.name || "",
                                city: location.city || "",
                                state: location.state || "",
                                country: location.country || "",
                                latitude: location.lat,
                                longitude: location.lon,
                                placeId: location.place_id || "",
                                formatted:
                                  location.formatted || location.name || "",
                              };

                              setSelectedState(
                                locationData.city || locationData.name,
                              );

                              setSelectedLocation(locationData);
                              setLocationSuggestions([]);
                              setLocationError("");
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "9px",
                              }}
                            >
                              <MapPin
                                size={16}
                                style={{
                                  marginTop: "2px",
                                  flexShrink: 0,
                                  color: "var(--primary)",
                                }}
                              />

                              <div>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: "0.9rem",
                                    color: "var(--text-main)",
                                  }}
                                >
                                  {tx(location.name)}
                                </div>

                                <div
                                  style={{
                                    marginTop: "2px",
                                    fontSize: "0.75rem",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {location.formatted ||
                                    [
                                      location.city,
                                      location.state,
                                      location.country,
                                    ]
                                      .filter(Boolean)
                                      .join(", ")}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Search error */}
                    {locationError && (
                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "12px",
                          color: "#dc2626",
                        }}
                      >
                        {locationError}
                      </div>
                    )}

                    {/* Selected location */}
                    {selectedLocation && (
                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "12px",
                          color: "#059669",
                          fontWeight: 600,
                        }}
                      >
                        ✓ {selectedLocation.formatted}
                      </div>
                    )}
                  </div>

                  {/* Check-In Date */}
                  <div className="search-field">
                    <label>
                      <Calendar size={14} /> {t("home.checkIn")}
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      value={checkInDate}
                      onChange={handleCheckInChange}
                      required
                    />
                  </div>

                  {/* Check-Out Date */}
                  <div className="search-field">
                    <label>
                      <Calendar size={14} /> {t("home.checkOut")}
                    </label>
                    <input
                      type="date"
                      min={checkInDate}
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      required
                    />
                  </div>

                  {/* Guests & Rooms Popover Trigger */}
                  <div
                    className="search-field"
                    style={{ position: "relative", cursor: "pointer" }}
                    onClick={() => setGuestPickerOpen(!guestPickerOpen)}
                  >
                    <label>
                      <Users size={14} /> {t("home.guests")}
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "0.95rem" }}> {plural(tx, adults, "{n} Adult", "{n} Adults")}, {children > 0 ? plural(tx, children, "{n} Child", "{n} Children") + ", " : ""}{plural(tx, rooms, "{n} Room", "{n} Rooms")} </span>
                      <ChevronDown size={16} color="var(--text-muted)" />
                    </div>

                    {/* Guest Counter Popover */}
                    {guestPickerOpen && (
                      <div
                        className="guest-popover"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="guest-row">
                          <div>
                            <strong>{tx("Adults")}</strong>
                            <span className="guest-sub">{tx("Age 13+")}</span>
                          </div>
                          <div className="counter-btns">
                            <button
                              type="button"
                              className="counter-btn"
                              disabled={adults <= 1}
                              onClick={() => setAdults(Math.max(1, adults - 1))}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="counter-val">{adults}</span>
                            <button
                              type="button"
                              className="counter-btn"
                              disabled={adults >= 10}
                              onClick={() => setAdults(adults + 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="guest-row">
                          <div>
                            <strong>{tx("Children")}</strong>
                            <span className="guest-sub">{tx("Age 0-12")}</span>
                          </div>
                          <div className="counter-btns">
                            <button
                              type="button"
                              className="counter-btn"
                              disabled={children <= 0}
                              onClick={() =>
                                setChildren(Math.max(0, children - 1))
                              }
                            >
                              <Minus size={14} />
                            </button>
                            <span className="counter-val">{children}</span>
                            <button
                              type="button"
                              className="counter-btn"
                              disabled={children >= 6}
                              onClick={() => setChildren(children + 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="guest-row">
                          <div>
                            <strong>{tx("Rooms")}</strong>
                            <span className="guest-sub">{tx("Required rooms")}</span>
                          </div>
                          <div className="counter-btns">
                            <button
                              type="button"
                              className="counter-btn"
                              disabled={rooms <= 1}
                              onClick={() => setRooms(Math.max(1, rooms - 1))}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="counter-val">{rooms}</span>
                            <button
                              type="button"
                              className="counter-btn"
                              disabled={rooms >= 6}
                              onClick={() => setRooms(rooms + 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            width: "100%",
                            marginTop: "0.75rem",
                            padding: "0.45rem",
                          }}
                          onClick={() => setGuestPickerOpen(false)}
                        >
                          {tx("Apply Selection")}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Search Action Button */}
                  <button type="submit" className="btn btn-primary search-btn">
                    <Search size={18} />
                    <span>{t("home.search")}</span>
                  </button>
                </div>
              </form>

              {/* Quick Suggestion Pills */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginTop: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "0.775rem",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                  }}
                >
                  {tx("QUICK DESTINATIONS:")}
                </span>
                {[
                  "Rajasthan",
                  "Kerala",
                  "Odisha",
                  "Goa",
                  "Ladakh",
                  "Himachal Pradesh",
                ].map((stateName) => (
                  <button
                    key={stateName}
                    type="button"
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.2rem 0.65rem",
                      background: "var(--bg-subtle)",
                      borderRadius: "999px",
                      color: "var(--text-main)",
                      border: "1px solid var(--border)",
                    }}
                    onClick={() => {
                      setSelectedState(stateName);
                    }}
                  >
                    {tx(stateName)}
                  </button>
                ))}
              </div>
            </div>

            <div className="hero-stats">
              <div>
                <strong><CountUp to={36} /></strong>
                <span>{tx("States & UTs")}</span>
              </div>
              <div>
                <strong><CountUp to={234} /></strong>
                <span>{tx("Curated landmarks")}</span>
              </div>
              <div>
                <strong><CountUp to={3} /></strong>
                <span>{tx("Room types per stay")}</span>
              </div>
              <div>
                <strong><CountUp to={100} suffix="%" /></strong>
                <span>{tx("Secure demo checkout")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top destinations: sideways scroller */}
      {homeStates.length > 0 && (
        <section className="section mmt-top-dest">
          <div className="container">
            <div className="mmt-row-head">
              <div>
                <h2 className="section-title">{tx("Top Destinations")}</h2>
                <p className="section-desc">{tx("Trending places across India, picked for you")}</p>
              </div>

              <div className="mmt-row-arrows">
                <button type="button" onClick={() => scrollTopDest(-1)} aria-label={tx("Scroll left")}>
                  <ChevronLeft size={20} />
                </button>
                <button type="button" onClick={() => scrollTopDest(1)} aria-label={tx("Scroll right")}>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="mmt-row" ref={topDestRef}>
              {homeStates.slice(0, 24).map((state) => (
                <button
                  key={state.slug}
                  type="button"
                  className="mmt-dest-card"
                  onClick={() => navigate(`/places/${state.slug}`)}
                >
                  <img src={state.image} alt={state.name} loading="lazy" />
                  <span className="mmt-dest-overlay">
                    <strong>{tx(state.name)}</strong>
                    <small>{state.type === "Union Territory" ? tx("Union Territory") : tx("State")}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured journeys: big sliding slides */}
      <FeaturedSlider items={featuredStates} onOpen={(slug) => navigate(`/places/${slug}`)} />

      {/* 2. Explore Regions of India */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <span className="section-tag">{tx("Explore India")}</span>
              <h2 className="section-title">{tx("Discover by Indian Region")}</h2>
              <p className="section-desc">
                {tx("From the snow-capped Himalayas in the North to the serene backwaters in the South.")}
              </p>
            </div>
            <button
              onClick={() => navigate("/state-region")}
              className="btn btn-outline"
            >
              <span>{tx("View All 36 States & UTs")}</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Region Tabs */}
          <div className="region-pills">
            {[
              "All Regions",
              "North",
              "South",
              "East",
              "West",
              "Central",
              "Northeast",
              "Union Territory",
            ].map((region) => (
              <button
                key={region}
                className={`region-pill ${activeRegion === region ? "active" : ""}`}
                onClick={() => setActiveRegion(region)}
              >
                {tx(region)}
              </button>
            ))}
          </div>

          {/* Popular Destinations Filtered Cards */}
          <div className="card-grid">
            {homeStatesLoading ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "3rem 1rem",
                  color: "var(--text-muted)",
                }}
              >
                {tx("Loading Indian destinations...")}
              </div>
            ) : homeStatesError ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "3rem 1rem",
                  color: "var(--text-muted)",
                }}
              >
                <p style={{ marginBottom: "1rem" }}>
                  {tx("Unable to load destinations.")}
                </p>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => window.location.reload()}
                >
                  {tx("Retry")}
                </button>
              </div>
            ) : filteredDestinations.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "3rem 1rem",
                  color: "var(--text-muted)",
                }}
              >
                {tx("No destinations found for this region.")}
              </div>
            ) : (
              (activeRegion === "All Regions" && !showAllStates
                ? filteredDestinations.slice(0, 6)
                : filteredDestinations
              ).map((dest) => {
                const fallbackImage =
                  "https://res.cloudinary.com/siqc8mbe/image/upload/f_auto,q_auto,w_700/voyara/places-v2/hawa-mahal";

                return (
                  <div key={dest.id} className="card">
                    <div className="card-media">
                      <img
                        src={dest.image || fallbackImage}
                        alt={`${dest.name} travel destination`}
                        loading="lazy"
                        onError={(e) => {
                          if (e.currentTarget.src !== fallbackImage) {
                            e.currentTarget.src = fallbackImage;
                          }
                        }}
                      />

                      <span className="card-badge">
                        {tx(dest.region)}
                      </span>

                      <span className="card-tag">
                        {tx(dest.tag)}
                      </span>
                    </div>

                    <div className="card-body">
                      <div className="card-location">
                        <MapPin size={14} />
                        <span>{tx("Capital: {name}", { name: dest.capital })}</span>
                      </div>

                      <h3 className="card-title">{tx(dest.name)}</h3>

                      <p className="card-desc">{tx("Top Spots: {list}", { list: dest.places })}</p>

                      <div className="card-footer">
                        <span
                          style={{
                            fontSize: "0.825rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {tx(dest.type)}
                        </span>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            padding: "0.4rem 0.85rem",
                            fontSize: "0.825rem",
                          }}
                          onClick={() =>
                            navigate(`/places/${dest.slug}`)
                          }
                        >
                          {tx("Explore Places")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {activeRegion === "All Regions" &&
            filteredDestinations.length > 6 && (
              <div className="show-more-row">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAllStates((v) => !v)}
                >
                  {showAllStates
                    ? tx("Show fewer destinations")
                    : `Show all ${filteredDestinations.length} destinations`}
                </button>
              </div>
            )}
        </div>
      </section>

      {/* 3. Featured Tourist Places */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <div>
              <span className="section-tag">{tx("Curated Cultural Heritage")}</span>
              <h2 className="section-title">{tx("Featured Tourist Places")}</h2>
              <p className="section-desc">
                {tx("Verified historical landmarks, architectural wonders, and natural sanctuaries across India.")}
              </p>
            </div>
            <button
              onClick={() => navigate("/state-region")}
              className="btn btn-outline"
            >
              <span>{tx("Explore All Places")}</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="card-grid card-grid-4">
            {featuredPlaces.map((place) => (
              <div key={place.id} className="card">
                <div className="card-media">
                  <img src={place.image} alt={place.name} loading="lazy" />
                  <span className="card-badge">{tx(place.category)}</span>
                </div>
                <div className="card-body">
                  <div className="card-location">
                    <MapPin size={14} /> {tx(place.city)}, {tx(place.state)}
                  </div>
                  <h3 className="card-title">{tx(place.name)}</h3>
                  <p className="card-desc">{tx(place.description)}</p>
                  <div className="card-footer">
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--primary-dark)",
                        fontWeight: 600,
                      }}
                    >
                      {tx("Verified Landmark")}
                    </span>
                    <button
                      className="btn btn-primary"
                      style={{
                        padding: "0.45rem 0.9rem",
                        fontSize: "0.825rem",
                      }}
                      onClick={() =>
                        navigate(
                          `/places/${place.state.toLowerCase().replace(/\s+/g, "-")}`,
                        )
                      }
                    >
                      {tx("Select Place")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Featured Accommodations (Stays) */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <span className="section-tag">{tx("VOYARA Demo Inventory")}</span>
              <h2 className="section-title">{tx("Handpicked Accommodations")}</h2>
              <p className="section-desc">
                {tx("Verified heritage havelis, luxury coastal villas, backwater resorts, and nature stays.")}
              </p>
            </div>
            <button
              onClick={() => navigate("/stays")}
              className="btn btn-outline"
            >
              <span>{tx("Browse All Stays")}</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="card-grid card-grid-4">
            {featuredStays.map((stay) => (
              <div key={stay.id} className="card">
                <div className="card-media">
                  <img src={stay.image} alt={stay.name} loading="lazy" />
                  <span className="card-badge">{tx(stay.type)}</span>
                  <span className="card-tag" style={{ background: "#0f766e" }}>
                    {tx("Demo Inventory")}
                  </span>
                </div>
                <div className="card-body">
                  <div className="card-location">
                    <MapPin size={14} /> {tx(stay.location)}
                  </div>
                  <h3 className="card-title">{tx(stay.name)}</h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      marginBottom: "0.75rem",
                      color: "#f59e0b",
                      fontSize: "0.85rem",
                    }}
                  >
                    <Star size={15} fill="#f59e0b" />
                    <strong>{stay.rating}</strong>
                    <span style={{ color: "var(--text-muted)" }}>
                      {tx("(Demo rating)")}
                    </span>
                  </div>

                  {/* Amenities Tags */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.35rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    {stay.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: "0.725rem",
                          background: "var(--bg-subtle)",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          color: "var(--text-muted)",
                        }}
                      >
                        {tx(amenity)}
                      </span>
                    ))}
                  </div>

                  <div className="card-footer">
                    <div className="card-price">
                      <span className="card-price-label">{tx("Price per night")}</span>
                      <span className="card-price-val">
                        {stay.price} <span>{tx("/ night")}</span>
                      </span>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                      onClick={() => navigate("/stays")}
                    >
                      {tx("Select Stay")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Why VOYARA Section */}
      <section className="section section-alt" id="why-voyara">
        <div className="container">
          <div
            className="section-header"
            style={{ textAlign: "center", display: "block" }}
          >
            <span className="section-tag">{tx("The VOYARA difference")}</span>
            <h2 className="section-title">{tx("Why Choose VOYARA?")}</h2>
            <p
              className="section-desc"
              style={{ maxWidth: "650px", margin: "0.5rem auto 0" }}
            >
              {tx("One place to discover, plan and book your trip across India, with nothing hidden along the way.")}
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-box">
              <div className="feature-icon">
                <Compass size={28} />
              </div>
              <h3 className="feature-title">{tx("All 36 States & UTs")}</h3>
              <p className="feature-desc">
                {tx("From the Himalayas to the islands, explore every Indian state and union territory, organised by region.")}
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="feature-title">{tx("Handpicked Places")}</h3>
              <p className="feature-desc">
                {tx("Heritage sites, natural wonders and cultural landmarks, curated with photos, timings and entry fees.")}
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon">
                <ShieldCheck size={28} />
              </div>
              <h3 className="feature-title">{tx("Honest Availability")}</h3>
              <p className="feature-desc">
                {tx("Rooms are checked for your dates and priced on the server, so what you see is what you pay.")}
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon">
                <Clock size={28} />
              </div>
              <h3 className="feature-title">{tx("Plan in One Flow")}</h3>
              <p className="feature-desc">
                {tx("Pick places, choose a stay, set your dates and review your whole trip before you pay.")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. AI Travel Assistant Section */}
      <section className="section">
        <div className="container">
          <div className="ai-banner">
            <div className="ai-banner-content">
              <div className="ai-badge">
                <Sparkles size={14} />
                <span>{tx("VOYARA Intelligent Engine")}</span>
              </div>
              <h2 className="ai-title">{tx("Ask VOYARA AI Assistant")}</h2>
              <p className="ai-desc">
                {tx("Need guidance tailoring your itinerary? Click any prompt chip below for smart trip recommendations, packing checklists, or customized duration advice:")}
              </p>

              {/* Clickable AI Prompt Chips */}
              <div className="ai-prompts">
                <button
                  type="button"
                  className="ai-prompt-chip"
                  onClick={() =>
                    handleAiPromptClick("Plan a 3-day trip to Odisha")
                  }
                >
                  {tx("\"Plan a 3-day trip to Odisha\"")}
                </button>
                <button
                  type="button"
                  className="ai-prompt-chip"
                  onClick={() =>
                    handleAiPromptClick("Best places in Rajasthan")
                  }
                >
                  {tx("\"Best places in Rajasthan\"")}
                </button>
                <button
                  type="button"
                  className="ai-prompt-chip"
                  onClick={() =>
                    handleAiPromptClick("Create a Kerala itinerary")
                  }
                >
                  {tx("\"Create a Kerala itinerary\"")}
                </button>
                <button
                  type="button"
                  className="ai-prompt-chip"
                  onClick={() =>
                    handleAiPromptClick("What should I pack for Ladakh?")
                  }
                >
                  {tx("\"What should I pack for Ladakh?\"")}
                </button>
              </div>

              {/* Interactive AI Preview Card */}
              {aiTip && (
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.12)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    padding: "1.25rem",
                    borderRadius: "12px",
                    marginBottom: "1.5rem",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "#6ee7b7",
                      fontWeight: 700,
                      marginBottom: "0.35rem",
                    }}
                  >
                    <Sparkles size={16} />
                    <span>{tx(aiTip.title)}</span>
                  </div>
                  <p
                    style={{
                      color: "#f1f5f9",
                      fontSize: "0.925rem",
                      lineHeight: "1.6",
                    }}
                  >
                    {tx(aiTip.body)}
                  </p>
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={() => handleAiPromptClick("Rajasthan")}
              >
                <Sparkles size={16} />
                <span>{tx("Get Instant Itinerary Tip")}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
