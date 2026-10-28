import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  ArrowUp,
  ArrowRight,
  BedDouble,
  Check,
  Clock,
  Coffee,
  Car,
  Dumbbell,
  ExternalLink,
  Flower2,
  Hotel,
  MapPin,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  Snowflake,
  SlidersHorizontal,
  Sparkles,
  Star,
  Utensils,
  Waves,
  Wifi,
  X,
  Zap,
  CalendarDays,
  Users,
  Mail,
} from "lucide-react";

import api, { getNearbyRestaurants, searchRealStays } from "../services/api";
import { distanceMeters, formatMeters } from "../utils/geo";
import PageHero from "../components/PageHero";
import DestinationSearch from "../components/DestinationSearch";
import FavoriteButton from "../components/FavoriteButton";
import StayLocation from "../components/StayLocation";
import ReviewsSection from "../components/ReviewsSection";
import { useLanguage } from "../context/LanguageContext";
import { plural } from "../i18n/plural";
import { tg } from "../i18n/runtime";

/*
 * ============================================================
 * CONSTANTS & HELPERS
 * ============================================================
 */

const PRICE_BUCKETS = [
  { id: "p1", label: "Under ₹1,500", min: 0, max: 1500 },
  { id: "p2", label: "₹1,500 – ₹2,500", min: 1500, max: 2500 },
  { id: "p3", label: "₹2,500 – ₹4,000", min: 2500, max: 4000 },
  { id: "p4", label: "₹4,000 – ₹6,000", min: 4000, max: 6000 },
  { id: "p5", label: "₹6,000 and above", min: 6000, max: Infinity },
];

const RATING_OPTIONS = [
  { value: 4.5, label: "Excellent: 4.5 & above" },
  { value: 4, label: "Very Good: 4 & above" },
  { value: 3.5, label: "Good: 3.5 & above" },
];

const SORT_OPTIONS = [
  { id: "nearplaces", label: "Near your places", needsPlaces: true },
  { id: "popularity", label: "Popularity" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "rating", label: "User Rating" },
  { id: "distance", label: "Distance" },
];

const NEAR_OPTIONS = [
  { km: 1, label: "Within 1 km of your places" },
  { km: 2, label: "Within 2 km of your places" },
  { km: 5, label: "Within 5 km of your places" },
];

const AMENITY_FILTERS = [
  "Free WiFi",
  "Swimming Pool",
  "Restaurant",
  "Parking",
  "Air Conditioning",
  "Spa",
  "Gym",
  "Kitchen",
];

const AMENITY_ICONS = {
  "Free WiFi": Wifi,
  "Swimming Pool": Waves,
  "Private Pool": Waves,
  Restaurant: Utensils,
  Bar: Coffee,
  Parking: Car,
  "Air Conditioning": Snowflake,
  Spa: Flower2,
  Gym: Dumbbell,
  "Power Backup": Zap,
  "24-hour Front Desk": Clock,
  "Room Service": BedDouble,
};

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDistance = (distance) => {
  const value = Number(distance);

  if (!Number.isFinite(value)) return "";

  if (value < 1000) return tg("{n} m from centre", { n: Math.round(value) });

  return tg("{n} km from centre", { n: (value / 1000).toFixed(1) });
};

// Room types are priced from the Standard Room by the same ratios the server uses
const roomPreview = (price) => [
  { name: "Standard Room", guests: 2, price },
  { name: "Deluxe Room", guests: 3, price: Math.round((price * 3499) / 2499 / 100) * 100 },
  { name: "Family Room", guests: 4, price: Math.round((price * 4499) / 2499 / 100) * 100 },
];

const ratingClass = (rating) =>
  rating >= 4.5 ? "great" : rating >= 4 ? "good" : rating >= 3.5 ? "fair" : "avg";

const StarRow = ({ count }) => (
  <span className="hotel-stars" aria-label={tg("{n} star hotel", { n: count })}>
    {Array.from({ length: count }).map((_, i) => (
      <Star key={i} size={13} fill="currentColor" />
    ))}
  </span>
);

const DETAIL_TABS = [
  ["overview", "Overview"],
  ["rooms", "Rooms"],
  ["location", "Location"],
  ["rules", "Property rules"],
  ["reviews", "User reviews"],
  ["similar", "Similar properties"],
];

const EMPTY_FILTERS = {
  prices: [],
  stars: [],
  minRating: 0,
  types: [],
  amenities: [],
  freeCancellation: false,
  payAtHotel: false,
  nearKm: 0,
  minPrice: "",
  maxPrice: "",
};

// Page and filter panel travel to the top together, over the same time, so they move in step
const scrollBothToTop = (panel) => {
  const fromPage = window.scrollY;
  const fromPanel = panel.scrollTop;
  const start = performance.now();

  const step = (now) => {
    const t = Math.min((now - start) / 500, 1);
    const left = 1 - (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

    window.scrollTo(0, fromPage * left);
    panel.scrollTop = fromPanel * left;

    if (t < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};

const toggleIn = (list, value) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

const Stays = () => {
  const { t: tx } = useLanguage();

  const location = useLocation();
  const navigate = useNavigate();

  // Destination comes from the previous page, or is chosen here on the page
  const routeLocation = location.state?.location || null;
  const [selectedLocation, setSelectedLocation] = useState(routeLocation);
  const selectedPlaces = location.state?.selectedPlaces || [];

  // Dates and guests picked earlier (home page), editable here
  const todayPlus = (n) => new Date(Date.now() + n * 864e5).toISOString().split("T")[0];
  const [search, setSearch] = useState({
    checkIn: location.state?.checkIn || todayPlus(1),
    checkOut: location.state?.checkOut || todayPlus(3),
    rooms: Number(location.state?.rooms) || 1,
    adults: Number(location.state?.adults) || 2,
    children: Number(location.state?.children) || 0,
  });

  // The places the traveler wants to visit, with usable coordinates
  const placePoints = useMemo(
    () =>
      selectedPlaces
        .map((p) => ({
          name: p.name,
          lat: Number(p.latitude ?? p.lat),
          lon: Number(p.longitude ?? p.lon),
        }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.state?.selectedPlaces]
  );

  const [stays, setStays] = useState([]);
  const [selectedStay, setSelectedStay] = useState(null);
  const [detailStay, setDetailStay] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState(placePoints.length > 0 ? "nearplaces" : "popularity");
  const [restaurants, setRestaurants] = useState({ loading: false, data: [] });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingStay, setSavingStay] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (routeLocation) setSelectedLocation(routeLocation);
  }, [routeLocation]);

  /*
   * FETCH REAL ACCOMMODATIONS
   */

  useEffect(() => {
    if (!selectedLocation) {
      setLoading(false);
      return;
    }

    const fetchStays = async () => {
      try {
        setLoading(true);
        setError("");
        setFilters(EMPTY_FILTERS);
        setSelectedStay(null);

        // With places chosen, look around their middle so every place is close to a hotel
        let latitude = Number(selectedLocation.latitude);
        let longitude = Number(selectedLocation.longitude);
        let radius = 15000;

        if (placePoints.length > 0) {
          latitude = placePoints.reduce((sum, p) => sum + p.lat, 0) / placePoints.length;
          longitude = placePoints.reduce((sum, p) => sum + p.lon, 0) / placePoints.length;

          const widest = Math.max(
            ...placePoints.map((p) => distanceMeters(latitude, longitude, p.lat, p.lon) || 0)
          );

          radius = Math.min(15000, Math.max(4000, Math.round(widest + 3000)));
        }

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setError(tx("Valid destination coordinates are not available."));
          return;
        }

        const response = await searchRealStays({
          lat: latitude,
          lon: longitude,
          radius,
          limit: 30,
        });

        if (!response?.success) {
          setError(
            response?.message || tx("Unable to find accommodations near this destination.")
          );
          return;
        }

        // How far each hotel is from every place on the trip
        const list = (Array.isArray(response.data) ? response.data : []).map((stay) => {
          const near = placePoints
            .map((p) => ({ name: p.name, meters: distanceMeters(stay.latitude, stay.longitude, p.lat, p.lon) }))
            .filter((n) => n.meters != null);

          const avgMeters = near.length ? near.reduce((sum, n) => sum + n.meters, 0) / near.length : null;

          return { ...stay, near, avgMeters };
        });

        setStays(list);
      } catch (err) {
        console.error("Accommodation Search Error:", err);

        setError(
          err.response?.data?.message ||
            tx("Unable to load accommodations right now. Please try again.")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStays();
  }, [selectedLocation]);

  /*
   * FILTER + SORT
   */

  const matchesFilters = (stay, f, skip) => {
    if (skip !== "prices" && f.prices.length) {
      const ok = f.prices.some((id) => {
        const b = PRICE_BUCKETS.find((x) => x.id === id);
        return b && stay.price >= b.min && stay.price < b.max;
      });
      if (!ok) return false;
    }
    if (f.minPrice !== "" && stay.price < Number(f.minPrice)) return false;
    if (f.maxPrice !== "" && stay.price > Number(f.maxPrice)) return false;
    if (skip !== "stars" && f.stars.length && !f.stars.includes(stay.stars)) return false;
    if (skip !== "rating" && f.minRating && stay.rating < f.minRating) return false;
    if (skip !== "types" && f.types.length && !f.types.includes(stay.stayType)) return false;
    if (skip !== "amenities" && f.amenities.length && !f.amenities.every((a) => stay.amenities?.includes(a))) return false;
    if (f.nearKm && (stay.avgMeters == null || stay.avgMeters > f.nearKm * 1000)) return false;
    if (f.freeCancellation && !stay.freeCancellation) return false;
    if (f.payAtHotel && !stay.payAtHotel) return false;
    return true;
  };

  const filteredStays = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const result = stays.filter((stay) => {
      const text = [stay.name, stay.address, stay.city].filter(Boolean).join(" ").toLowerCase();
      return (!query || text.includes(query)) && matchesFilters(stay, filters);
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "rating":
          return b.rating - a.rating || b.reviewCount - a.reviewCount;
        case "nearplaces":
          return Number(a.avgMeters ?? Infinity) - Number(b.avgMeters ?? Infinity);
        case "distance":
          return Number(a.distance ?? Infinity) - Number(b.distance ?? Infinity);
        default:
          // popularity: well-rated and widely reviewed first
          return b.rating * Math.log(b.reviewCount + 2) - a.rating * Math.log(a.reviewCount + 2);
      }
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stays, searchTerm, filters, sortBy]);

  // How many properties each filter option would give (ignoring that filter group itself)
  const counts = useMemo(() => {
    const c = { prices: {}, stars: {}, types: {}, amenities: {}, rating: {} };

    PRICE_BUCKETS.forEach((b) => {
      c.prices[b.id] = stays.filter((s) => s.price >= b.min && s.price < b.max && matchesFilters(s, filters, "prices")).length;
    });
    [2, 3, 4, 5].forEach((n) => {
      c.stars[n] = stays.filter((s) => s.stars === n && matchesFilters(s, filters, "stars")).length;
    });
    [...new Set(stays.map((s) => s.stayType))].forEach((t) => {
      c.types[t] = stays.filter((s) => s.stayType === t && matchesFilters(s, filters, "types")).length;
    });
    AMENITY_FILTERS.forEach((a) => {
      c.amenities[a] = stays.filter((s) => s.amenities?.includes(a) && matchesFilters(s, filters, "amenities")).length;
    });
    RATING_OPTIONS.forEach((r) => {
      c.rating[r.value] = stays.filter((s) => s.rating >= r.value && matchesFilters(s, filters, "rating")).length;
    });

    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stays, filters]);

  const typeOptions = useMemo(() => {
    const labels = {};
    stays.forEach((s) => {
      labels[s.stayType] = s.stayTypeLabel;
    });
    return Object.entries(labels);
  }, [stays]);

  const activeFilterCount =
    filters.prices.length +
    filters.stars.length +
    (filters.minRating ? 1 : 0) +
    filters.types.length +
    filters.amenities.length +
    (filters.freeCancellation ? 1 : 0) +
    (filters.payAtHotel ? 1 : 0) +
    (filters.nearKm ? 1 : 0) +
    (filters.minPrice !== "" || filters.maxPrice !== "" ? 1 : 0);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  // Hotel details: tab bar, jump to a section, similar stays
  const [detailTab, setDetailTab] = useState("overview");

  const goToSection = (id) => {
    setDetailTab(id);
    document.getElementById(`hd-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openStay = (stay) => {
    setDetailStay(stay);
    setDetailTab("overview");
    document.querySelector(".hotel-modal-backdrop")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const similarStays = useMemo(
    () =>
      detailStay
        ? stays
            .filter((s) => s.placeId !== detailStay.placeId)
            .sort((x, y) => Math.abs(x.price - detailStay.price) - Math.abs(y.price - detailStay.price))
            .slice(0, 6)
        : [],
    [stays, detailStay]
  );

  // Real restaurants around the hotel, loaded when its details are opened
  useEffect(() => {
    if (!detailStay) return undefined;

    let active = true;
    setRestaurants({ loading: true, data: [] });

    getNearbyRestaurants({ lat: detailStay.latitude, lon: detailStay.longitude, radius: 1200, limit: 8 })
      .then((res) => active && setRestaurants({ loading: false, data: res.data || [] }))
      .catch(() => active && setRestaurants({ loading: false, data: [] }));

    return () => {
      active = false;
    };
  }, [detailStay]);

  /*
   * SELECT STAY
   */

  const handleSelectStay = (stay) => {
    setSelectedStay((current) => (current?.placeId === stay.placeId ? null : stay));
    setError("");
  };

  /*
   * SAVE STAY TO MONGODB, THEN CONTINUE
   */

  const saveSelectedStay = async (stay) => {
    const response = await api.post("/location/stays/save", {
      placeId: stay.placeId,
      name: stay.name,
      address: stay.address || "",
      city: stay.city || "",
      state: stay.state || "",
      latitude: stay.latitude ?? null,
      longitude: stay.longitude ?? null,
      categories: stay.categories || [],
      website: stay.website || "",
      phone: stay.phone || "",
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || tx("Failed to save selected stay."));
    }

    return response.data.data;
  };

  const handleContinue = async () => {
    if (!selectedStay || savingStay) return;

    try {
      setSavingStay(true);
      setError("");

      const savedStay = await saveSelectedStay(selectedStay);

      const stayForTrip = {
        ...selectedStay,
        mongoStayId: savedStay?._id || null,
        geoapifyPlaceId: savedStay?.geoapifyPlaceId || selectedStay.placeId,
        image: savedStay?.image || selectedStay.image || "",
        cloudinaryPublicId: savedStay?.cloudinaryPublicId || "",
      };

      navigate("/dates", {
        state: {
          location: selectedLocation,
          selectedPlaces,
          selectedStay: stayForTrip,
          ...search,
        },
      });
    } catch (err) {
      console.error("Save Stay Error:", err);

      setError(
        err.response?.data?.message || err.message || tx("Unable to save this stay. Please try again.")
      );
    } finally {
      setSavingStay(false);
    }
  };

  /*
   * NO DESTINATION YET
   */

  if (!selectedLocation) {
    return (
      <div className="stays-page">
        <PageHero
          center
          eyebrow={tx("Hotels, resorts, villas & homestays")}
          icon={<Hotel />}
          title={<>{tx("Find your")} <span>{tx("perfect stay")}</span></>}
          subtitle={tx("Search a destination to see hotels, resorts, villas and homestays near the places you want to visit.")}
        >
          <div className="page-hero-card stays-search-card">
            <DestinationSearch onSelect={setSelectedLocation} />
          </div>
        </PageHero>
      </div>
    );
  }

  const locationName = selectedLocation.city || selectedLocation.name || "your destination";

  // "Puri, Odisha, India": each part is translated on its own
  const formattedLocation = (
    selectedLocation.formatted ||
    [selectedLocation.city, selectedLocation.state, selectedLocation.country].filter(Boolean).join(", ")
  )
    .split(", ")
    .map((part) => tx(part))
    .join(", ");

  /*
   * FILTER SIDEBAR (shared by desktop sidebar and mobile drawer)
   */

  const sidebar = (
    <aside className={`hotel-filters ${filtersOpen ? "open" : ""}`}>
      <div className="hotel-filters-head">
        <h2>
          <SlidersHorizontal size={17} /> {tx("Filters")}
        </h2>

        {activeFilterCount > 0 && (
          <button type="button" className="hotel-clear" onClick={() => setFilters(EMPTY_FILTERS)}>
            {tx("Clear all")}
          </button>
        )}

        <button type="button" className="hotel-filters-close" onClick={() => setFiltersOpen(false)} aria-label={tx("Close filters")}>
          <X size={20} />
        </button>
      </div>

      <div className="hotel-filter-group">
        <h3>{tx("Your budget (per night)")}</h3>
        {PRICE_BUCKETS.map((b) => (
          <label key={b.id} className="hotel-check">
            <input type="checkbox" checked={filters.prices.includes(b.id)} onChange={() => setFilter("prices", toggleIn(filters.prices, b.id))} />
            <span>{tx(b.label)}</span>
            <em>{counts.prices[b.id]}</em>
          </label>
        ))}

        <div className="hotel-budget">
          <input type="number" min="0" inputMode="numeric" placeholder="Min" aria-label="Minimum price per night" value={filters.minPrice} onChange={(e) => setFilter("minPrice", e.target.value)} />
          <span>to</span>
          <input type="number" min="0" inputMode="numeric" placeholder="Max" aria-label="Maximum price per night" value={filters.maxPrice} onChange={(e) => setFilter("maxPrice", e.target.value)} />
        </div>
      </div>

      {placePoints.length > 0 && (
        <div className="hotel-filter-group">
          <h3>{tx("Distance from your places")}</h3>
          {NEAR_OPTIONS.map((o) => (
            <label key={o.km} className="hotel-check">
              <input type="radio" name="near-km" checked={filters.nearKm === o.km} onChange={() => setFilter("nearKm", o.km)} />
              <span>{tx(o.label)}</span>
            </label>
          ))}
          {filters.nearKm > 0 && (
            <button type="button" className="hotel-link-btn" onClick={() => setFilter("nearKm", 0)}>
              {tx("Any distance")}
            </button>
          )}
        </div>
      )}

      <div className="hotel-filter-group">
        <h3>{tx("Free cancellation & payment")}</h3>
        <label className="hotel-check">
          <input type="checkbox" checked={filters.freeCancellation} onChange={(e) => setFilter("freeCancellation", e.target.checked)} />
          <span>{tx("Free Cancellation")}</span>
        </label>
        <label className="hotel-check">
          <input type="checkbox" checked={filters.payAtHotel} onChange={(e) => setFilter("payAtHotel", e.target.checked)} />
          <span>{tx("Pay at Hotel")}</span>
        </label>
      </div>

      <div className="hotel-filter-group">
        <h3>{tx("Star category")}</h3>
        {[5, 4, 3, 2].map((n) => (
          <label key={n} className="hotel-check">
            <input type="checkbox" checked={filters.stars.includes(n)} onChange={() => setFilter("stars", toggleIn(filters.stars, n))} />
            <span className="hotel-check-stars">{tx("{n} Star", { n })} <StarRow count={n} /></span>
            <em>{counts.stars[n]}</em>
          </label>
        ))}
      </div>

      <div className="hotel-filter-group">
        <h3>{tx("User rating")}</h3>
        {RATING_OPTIONS.map((r) => (
          <label key={r.value} className="hotel-check">
            <input type="radio" name="min-rating" checked={filters.minRating === r.value} onChange={() => setFilter("minRating", r.value)} />
            <span>{tx(r.label)}</span>
            <em>{counts.rating[r.value]}</em>
          </label>
        ))}
        {filters.minRating > 0 && (
          <button type="button" className="hotel-link-btn" onClick={() => setFilter("minRating", 0)}>
            {tx("Any rating")}
          </button>
        )}
      </div>

      <div className="hotel-filter-group">
        <h3>{tx("Property type")}</h3>
        {typeOptions.map(([id, label]) => (
          <label key={id} className="hotel-check">
            <input type="checkbox" checked={filters.types.includes(id)} onChange={() => setFilter("types", toggleIn(filters.types, id))} />
            <span>{tx(label)}</span>
            <em>{counts.types[id]}</em>
          </label>
        ))}
      </div>

      <div className="hotel-filter-group">
        <h3>{tx("Amenities")}</h3>
        {AMENITY_FILTERS.map((a) => (
          <label key={a} className="hotel-check">
            <input type="checkbox" checked={filters.amenities.includes(a)} onChange={() => setFilter("amenities", toggleIn(filters.amenities, a))} />
            <span>{tx(a)}</span>
            <em>{counts.amenities[a]}</em>
          </label>
        ))}
      </div>

      <button type="button" className="hotel-filters-top" aria-label="Back to top" title="Back to top" onClick={(e) => scrollBothToTop(e.currentTarget.closest(".hotel-filters"))}>
        <ArrowUp size={20} />
      </button>

      <button type="button" className="btn btn-primary hotel-filters-apply" onClick={() => setFiltersOpen(false)}> {plural(tx, filteredStays.length, "Show {n} property", "Show {n} properties")} </button>
    </aside>
  );

  /*
   * PAGE
   */

  return (
    <div className="hotels-page">
      <PageHero
        compact
        eyebrow={tx("Hotels near the places you picked")}
        icon={<Hotel />}
        title={<>{tx("Stays in")} <span>{locationName}</span></>}
        subtitle={formattedLocation}
      />

      {/* Search summary bar */}
      <section className="hotels-bar">
        <div className="container hotels-bar-inner">
          <button className="hotels-bar-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
            {tx("Back")}
          </button>

          <div className="hotels-bar-field">
            <label>{tx("CITY / AREA")}</label>
            <strong>
              <MapPin size={15} /> {locationName}
            </strong>
            <small>{formattedLocation}</small>
          </div>

          <div className="hotels-bar-field">
            <label>
              <CalendarDays size={11} /> {tx("CHECK-IN / CHECK-OUT")}
            </label>
            <div className="hotels-bar-dates">
              <input
                type="date"
                value={search.checkIn}
                min={todayPlus(0)}
                onChange={(e) =>
                  setSearch((c) => ({
                    ...c,
                    checkIn: e.target.value,
                    checkOut: c.checkOut <= e.target.value ? e.target.value : c.checkOut,
                  }))
                }
              />
              <span>→</span>
              <input
                type="date"
                value={search.checkOut}
                min={search.checkIn}
                onChange={(e) => setSearch((c) => ({ ...c, checkOut: e.target.value }))}
              />
            </div>
          </div>

          <div className="hotels-bar-field">
            <label>
              <Users size={11} /> {tx("GUESTS & ROOMS")}
            </label>
            <div className="hotels-bar-guests">
              <select value={search.adults} onChange={(e) => setSearch((c) => ({ ...c, adults: Number(e.target.value) }))} aria-label={tx("Adults")}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>{plural(tx, n, "{n} Adult", "{n} Adults")}</option>
                ))}
              </select>
              <select value={search.children} onChange={(e) => setSearch((c) => ({ ...c, children: Number(e.target.value) }))} aria-label={tx("Children")}>
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{plural(tx, n, "{n} Child", "{n} Children")}</option>
                ))}
              </select>
              <select value={search.rooms} onChange={(e) => setSearch((c) => ({ ...c, rooms: Number(e.target.value) }))} aria-label={tx("Rooms")}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{plural(tx, n, "{n} Room", "{n} Rooms")}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="hotels-bar-field grow">
            <label>{tx("SEARCH BY HOTEL NAME")}</label>
            <div className="hotels-bar-search">
              <Search size={16} />
              <input
                type="text"
                placeholder={tx("e.g. Palace, Resort, Heritage")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm("")} aria-label={tx("Clear search")}>
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          <button className="btn btn-primary hotels-bar-change" onClick={() => setSelectedLocation(null)}>
            {tx("Change destination")}
          </button>
        </div>
      </section>

      <div className="container hotels-layout">
        {sidebar}
        {filtersOpen && <div className="hotel-filters-backdrop" onClick={() => setFiltersOpen(false)} />}

        <main className="hotels-results">
          <div className="hotels-results-head">
            <div>
              <h1>
                {loading ? tx("Finding stays...") : `${filteredStays.length} of ${stays.length} properties in ${locationName}`}
              </h1>

              <span className="hotels-step">{tx("STEP 1 OF 9 • CHOOSE YOUR STAY")}</span>
            </div>

            <button type="button" className="hotels-filter-btn" onClick={() => setFiltersOpen(true)}> <SlidersHorizontal size={16} /> {tx("Filters")}{activeFilterCount ? ` (${activeFilterCount})` : ""} </button>
          </div>

          {selectedPlaces.length > 0 && (
            <div className="hotels-places-note"> <MapPin size={15} /> {selectedPlaces.length === 1 ? tx("Hotels near your place:") : tx("Hotels near your {n} places:", { n: selectedPlaces.length })} {selectedPlaces.map((p) => p.name).join(", ")} </div>
          )}

          <div className="hotels-sort" role="tablist" aria-label={tx("Sort properties")}>
            <span>{tx("SORT BY")}</span>
            {SORT_OPTIONS.filter((o) => !o.needsPlaces || placePoints.length > 0).map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={sortBy === option.id}
                className={sortBy === option.id ? "active" : ""}
                onClick={() => setSortBy(option.id)}
              >
                {tx(option.label)}
              </button>
            ))}
          </div>

          {error && (
            <div className="hotels-error">
              <strong>{error}</strong>
            </div>
          )}

          {loading && (
            <div className="hotel-list">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="hotel-skeleton" />
              ))}
            </div>
          )}

          {!loading && !error && filteredStays.length === 0 && (
            <div className="hotels-empty">
              <Hotel size={44} />
              <h2>{tx("No properties match your filters")}</h2>
              <p>{tx("Try removing a filter or two to see more stays.")}</p>
              <button type="button" className="btn btn-primary" onClick={() => { setFilters(EMPTY_FILTERS); setSearchTerm(""); }}>
                {tx("Clear all filters")}
              </button>
            </div>
          )}

          {!loading && filteredStays.length > 0 && (
            <div className="hotel-list">
              {filteredStays.map((stay) => {
                const isSelected = selectedStay?.placeId === stay.placeId;

                return (
                  <article key={stay.placeId} className={`hotel-card ${isSelected ? "selected" : ""}`}>
                    <div className="hotel-card-image" onClick={() => openStay(stay)}>
                      {stay.image ? (
                        <img
                          src={stay.image}
                          alt={stay.name}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="hotel-card-placeholder">
                          <Hotel size={40} />
                        </div>
                      )}

                      <span className="hotel-type-tag">{stay.stayTypeLabel}</span>

                      {sortBy === "nearplaces" && filteredStays.indexOf(stay) < 3 && stay.avgMeters != null && (
                        <span className="hotel-closest-tag">{tx("Closest to your places")}</span>
                      )}

                      <div className="hotel-card-fav">
                        <FavoriteButton
                          item={{
                            itemType: "stay",
                            itemId: stay.placeId,
                            name: stay.name,
                            image: stay.image || "",
                            city: stay.city || locationName,
                            state: stay.state || "",
                          }}
                        />
                      </div>
                    </div>

                    <div className="hotel-card-body">
                      <div className="hotel-card-top">
                        <h3 onClick={() => openStay(stay)}>{tx(stay.name)}</h3>
                        <StarRow count={stay.stars} />
                      </div>

                      <p className="hotel-locality">
                        <MapPin size={13} />
                        {stay.address || stay.city}
                        {stay.distance != null && <span> • {formatDistance(stay.distance)}</span>}
                      </p>

                      {stay.near?.length > 0 && (
                        <div className="hotel-near">
                          {stay.near.slice(0, 3).map((n) => (
                            <span key={n.name}> <MapPin size={12} /> {tx("{dist} from {name}", { dist: formatMeters(n.meters), name: n.name })} </span>
                          ))}
                          {stay.near.length > 3 && <span className="more">{tx("+{n} more places", { n: stay.near.length - 3 })}</span>}
                        </div>
                      )}

                      <div className="hotel-amenities">
                        {stay.amenities.slice(0, 4).map((a) => {
                          const Icon = AMENITY_ICONS[a] || Check;
                          return (
                            <span key={a}>
                              <Icon size={13} />
                              {tx(a)}
                            </span>
                          );
                        })}
                        {stay.amenities.length > 4 && <span className="more">{tx("+{n} more", { n: stay.amenities.length - 4 })}</span>}
                      </div>

                      <div className="hotel-perks">
                        {stay.freeCancellation ? (
                          <span className="perk good">
                            <ShieldCheck size={14} /> {tx("Free Cancellation")}
                          </span>
                        ) : (
                          <span className="perk">{tx("Non-refundable")}</span>
                        )}
                        {stay.payAtHotel && <span className="perk good">{tx("Pay at Hotel available")}</span>}
                      </div>
                    </div>

                    <div className="hotel-card-price">
                      <div className={`hotel-rating ${ratingClass(stay.rating)}`}>
                        <div>
                          <strong>{stay.ratingLabel}</strong>
                          <small>{stay.reviewCount.toLocaleString("en-IN")} {tx(stay.ratingIsReal ? "VOYARA ratings" : "ratings")}</small>
                        </div>
                        <span>{Number(stay.rating).toFixed(1)}</span>
                      </div>

                      <div className="hotel-price-block">
                        <span className="hotel-discount">{tx("{n}% off", { n: stay.discountPercent })}</span>
                        <del>{money(stay.originalPrice)}</del>
                        <strong>{money(stay.price)}</strong>
                        <small>+ {money(stay.taxesPerNight)} {tx("taxes & fees")}</small>
                        <small>{tx("per night")}</small>
                      </div>

                      <div className="hotel-card-actions">
                        <button type="button" className="hotel-btn-outline" onClick={() => openStay(stay)}>
                          {tx("View Details")}
                        </button>

                        <button
                          type="button"
                          className={`hotel-btn-select ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelectStay(stay)}
                        >
                          {isSelected ? (
                            <>
                              <Check size={15} /> {tx("Selected")}
                            </>
                          ) : (
                            tx("Select Stay")
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && stays.length > 0 && (
            <p className="hotels-demo-note">
              {tx("Prices, star classes and amenities are demo data for this project. Traveler ratings turn into real ones as guests review a stay.")}
            </p>
          )}
        </main>
      </div>

      {/* Hotel details */}
      {detailStay && (
        <div className="hotel-modal-backdrop" onClick={() => setDetailStay(null)}>
          <div className="hotel-modal" role="dialog" aria-modal="true" aria-label={detailStay.name} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="hotel-modal-close" onClick={() => setDetailStay(null)} aria-label={tx("Close")}>
              <X size={20} />
            </button>

            <div className="hotel-modal-hero">
              {detailStay.image && <img src={detailStay.image} alt={detailStay.name} />}
              <span className="hotel-type-tag">{detailStay.stayTypeLabel}</span>
            </div>

            <nav className="hd-tabs" aria-label="Sections">
              {DETAIL_TABS.map(([id, label]) => (
                <button key={id} type="button" className={detailTab === id ? "active" : ""} onClick={() => goToSection(id)}>
                  {label}
                </button>
              ))}
            </nav>

            <div className="hotel-modal-body">
              <p className="hd-crumbs">
                Stays <span>›</span> {locationName} <span>›</span> <strong>{tx(detailStay.name)}</strong>
              </p>

              <div className="hotel-modal-title">
                <div>
                  <h2>{tx(detailStay.name)}</h2>
                  <StarRow count={detailStay.stars} />
                  <p className="hotel-locality">
                    <MapPin size={14} />
                    {detailStay.address || detailStay.city}
                  </p>
                </div>

                <div className="hd-title-side">
                  <FavoriteButton
                    item={{
                      itemType: "stay",
                      itemId: detailStay.placeId,
                      name: detailStay.name,
                      image: detailStay.image || "",
                      city: detailStay.city || locationName,
                    }}
                  />

                  <div className={`hotel-rating ${ratingClass(detailStay.rating)}`}>
                    <div>
                      <strong>{detailStay.ratingLabel}</strong>
                      <small>{detailStay.reviewCount.toLocaleString("en-IN")} {tx("ratings")}</small>
                    </div>
                    <span>{Number(detailStay.rating).toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Overview: facilities on the left, booking card on the right */}
              <div className="hotel-modal-grid hd-section" id="hd-overview">
                <section>
                  <h3>{tx("Hotel facilities")}</h3>
                  <ul className="hotel-amenity-grid">
                    {detailStay.amenities.map((a) => {
                      const Icon = AMENITY_ICONS[a] || Sparkles;
                      const verified = detailStay.amenitiesVerified?.includes(a);
                      return (
                        <li key={a} className={verified ? "verified" : ""}>
                          <Icon size={16} />
                          {tx(a)}
                          {verified && <em title={tx("Listed by the property in the map data")}>{tx("✓ listed")}</em>}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="hotel-fine-print">
                    {detailStay.amenitiesVerified?.length
                      ? tx("✓ marks facilities the property itself lists. The rest are typical for this kind of property.")
                      : tx("Facilities shown are typical for this kind of property. Confirm with the hotel.")}
                  </p>

                  {(detailStay.facilities?.phone || detailStay.facilities?.email || detailStay.facilities?.openingHours) && (
                    <ul className="hotel-rules hotel-contact">
                      {detailStay.facilities.phone && (
                        <li>
                          <Phone size={15} /> {detailStay.facilities.phone}
                        </li>
                      )}
                      {detailStay.facilities.email && (
                        <li>
                          <Mail size={15} /> {detailStay.facilities.email}
                        </li>
                      )}
                      {detailStay.facilities.openingHours && (
                        <li>
                          <Clock size={15} /> {detailStay.facilities.openingHours}
                        </li>
                      )}
                    </ul>
                  )}

                  <div className="hotel-modal-links">
                    {detailStay.latitude != null && detailStay.longitude != null && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${detailStay.latitude},${detailStay.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Navigation size={15} /> {tx("View on map")}
                      </a>
                    )}
                    {detailStay.website && (
                      <a href={detailStay.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={15} /> {tx("Website")}
                      </a>
                    )}
                    {detailStay.phone && (
                      <a href={`tel:${detailStay.phone}`}>
                        <Phone size={15} /> {detailStay.phone}
                      </a>
                    )}
                  </div>
                </section>

                <section className="hd-book">
                  <small>Per night from</small>
                  <div className="hd-book-price">
                    <strong>{money(detailStay.price)}</strong>
                    <span>+ taxes</span>
                  </div>
                  <p className={`hd-book-policy ${detailStay.freeCancellation ? "free" : ""}`}>
                    {detailStay.freeCancellation ? tx("Free cancellation until 24 hours before check-in") : tx("Non-refundable: this property does not offer free cancellation")}
                  </p>
                  <p className="hd-book-dates">
                    {search.checkIn} → {search.checkOut} · {plural(tx, search.rooms, "{n} Room", "{n} Rooms")}, {search.adults} {tx("Adults")}
                  </p>

                  <button
                    type="button"
                    className="btn btn-primary hotel-modal-select"
                    onClick={() => {
                      setSelectedStay(detailStay);
                      setDetailStay(null);
                    }}
                  >
                    {tx("Select this stay")} <ArrowRight size={17} />
                  </button>

                  <p className="hotel-modal-hint">{tx("You choose the room and dates on the next step.")}</p>
                </section>
              </div>

              {/* Rooms */}
              <section className="hd-section" id="hd-rooms">
                <h3 className="hd-h">{tx("Room options")}</h3>

                <div className="hd-rooms">
                  {roomPreview(detailStay.price).map((room) => (
                    <article key={room.name} className="hd-room">
                      <div>
                        <strong>{tx(room.name)}</strong>
                        <small>{tx("Up to {n} guests", { n: room.guests })}</small>
                        <ul>
                          <li>{detailStay.freeCancellation ? tx("Free cancellation until 24 hours before check-in") : tx("Non-refundable: this property does not offer free cancellation")}</li>
                          <li>{detailStay.payAtHotel ? tx("Pay at the hotel is available") : tx("Payment is taken online at booking")}</li>
                        </ul>
                      </div>

                      <div className="hd-room-price">
                        <strong>{money(room.price)}</strong>
                        <small>{tx("per night + taxes")}</small>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setSelectedStay(detailStay);
                            setDetailStay(null);
                          }}
                        >
                          Select
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {/* Location */}
              <section className="hd-section" id="hd-location">
                <StayLocation stay={detailStay} others={stays} />

                {selectedPlaces.length > 0 && detailStay.near?.length > 0 && (
                  <>
                    <h4 className="hd-sub">{tx("Distance from your places")}</h4>
                    <ul className="hotel-rules">
                      {detailStay.near.map((n) => (
                        <li key={n.name}> <MapPin size={15} /> {tx("{dist} from {name}", { dist: formatMeters(n.meters), name: n.name })} </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="hotel-restaurants">
                  <h4 className="hd-sub">{tx("Restaurants & cafes within 1.2 km")}</h4>

                  {restaurants.loading && <p className="hotel-fine-print">{tx("Finding places to eat...")}</p>}

                  {!restaurants.loading && restaurants.data.length === 0 && (
                    <p className="hotel-fine-print">{tx("No restaurants were found nearby in the map data.")}</p>
                  )}

                  <ul className="hotel-restaurant-list">
                    {restaurants.data.map((r) => (
                      <li key={r.placeId}>
                        <div>
                          <strong>{tx(r.name)}</strong>
                          <small>
                            {tx(r.type)}
                            {r.cuisines.length > 0 && ` · ${r.cuisines.slice(0, 3).join(", ")}`}
                          </small>
                        </div>

                        <div className="hotel-restaurant-meta">
                          {r.vegetarianOnly ? <span className="tag veg">{tx("Pure veg")}</span> : r.vegetarian && <span className="tag veg">{tx("Veg options")}</span>}
                          {r.halal && <span className="tag">{tx("Halal")}</span>}
                          {r.distance != null && <em>{formatMeters(r.distance)}</em>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Property rules */}
              <section className="hd-section" id="hd-rules">
                <h3 className="hd-h">{tx("Property rules")}</h3>
                <ul className="hotel-rules">
                  <li>
                    <Clock size={15} /> {tx("Check-in from 12:00 PM, check-out by 11:00 AM")}
                  </li>
                  <li>
                    <ShieldCheck size={15} />
                    {detailStay.freeCancellation
                      ? tx("Free cancellation until 24 hours before check-in")
                      : tx("Non-refundable: this property does not offer free cancellation")}
                  </li>
                  <li>
                    <Check size={15} />
                    {detailStay.payAtHotel ? tx("Pay at the hotel is available") : tx("Payment is taken online at booking")}
                  </li>
                  <li>
                    <Check size={15} /> {tx("Valid government photo ID is required at check-in")}
                  </li>
                </ul>
              </section>

              {/* Reviews */}
              <div className="hd-section" id="hd-reviews">
                <ReviewsSection itemType="stay" itemId={detailStay.placeId} />
              </div>

              {/* Similar stays from the same search, closest in price first */}
              {similarStays.length > 0 && (
                <section className="hd-section" id="hd-similar">
                  <h3 className="hd-h">Similar properties</h3>

                  <div className="hd-similar">
                    {similarStays.map((s) => (
                      <article key={s.placeId} className="hd-similar-card">
                        {s.image && <img src={s.image} alt="" loading="lazy" />}
                        <div>
                          <strong>{tx(s.name)}</strong>
                          <StarRow count={s.stars} />
                          <span className="hd-similar-price">{money(s.price)} <small>per night + taxes</small></span>
                          <span className={`hd-chip ${ratingClass(s.rating)}`}>{Number(s.rating).toFixed(1)} {s.ratingLabel}</span>
                          <button type="button" className="btn hd-similar-btn" onClick={() => openStay(s)}>
                            View details
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected stay / continue */}
      {selectedStay && (
        <div className="stays-selection-bar">
          <div className="container">
            <div className="stays-selection-info">
              <div className="stays-selection-icon">
                <Check size={20} />
              </div>

              <div>
                <strong>{tx(selectedStay.name)}</strong>
                <span> {tx("{price} per night", { price: money(selectedStay.price) })} • {selectedStay.stayTypeLabel} {selectedStay.freeCancellation ? tx(" • Free Cancellation") : ""} </span>
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleContinue} disabled={savingStay}>
              {savingStay ? (
                <>{tx("Saving Stay...")}</>
              ) : (
                <>
                  {tx("Continue to Dates")}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stays;
