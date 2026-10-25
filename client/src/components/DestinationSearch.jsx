import React, { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";

import { searchLocations } from "../services/api";
import { useLanguage } from "../context/LanguageContext";

// `state` disambiguates cities that share a name across India (e.g. Udaipur)
const QUICK_DESTINATIONS = [
  { label: "Jaipur", text: "Jaipur", state: "Rajasthan" },
  { label: "Goa", text: "Panaji", state: "Goa" },
  { label: "Kochi", text: "Kochi", state: "Kerala" },
  { label: "Manali", text: "Manali", state: "Himachal Pradesh" },
  { label: "Puri", text: "Puri", state: "Odisha" },
  { label: "Varanasi", text: "Varanasi", state: "Uttar Pradesh" },
  { label: "Udaipur", text: "Udaipur", state: "Rajasthan" },
  { label: "Mumbai", text: "Mumbai", state: "Maharashtra" },
];

const toLocation = (item) => ({
  name: item.name || "",
  city: item.city || item.name || "",
  state: item.state || "",
  country: item.country || "",
  latitude: item.lat,
  longitude: item.lon,
  placeId: item.place_id || "",
  formatted: item.formatted || item.name || "",
});

/**
 * Destination picker with live suggestions and one-tap popular cities.
 * Calls onSelect(location) with { name, city, state, country, latitude, longitude, ... }.
 */
const DestinationSearch = ({ onSelect }) => {
  const { t: tx } = useLanguage();

  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const query = text.trim();

    if (query.length < 2) {
      setSuggestions([]);
      return undefined;
    }

    const id = ++requestId.current;

    const timer = setTimeout(async () => {
      setSearching(true);

      try {
        const res = await searchLocations({ text: query });

        // Ignore responses that arrive after a newer keystroke
        if (id === requestId.current) {
          setSuggestions((res.data || []).filter((i) => i.lat && i.lon));
        }
      } catch (err) {
        if (id === requestId.current) setSuggestions([]);
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [text]);

  const pick = (item) => {
    setSuggestions([]);
    onSelect(toLocation(item));
  };

  const pickQuick = async ({ label, text: query, state }) => {
    setError("");

    try {
      const res = await searchLocations({ text: query, limit: 10 });
      const results = (res.data || []).filter((i) => i.lat && i.lon);

      const match =
        results.find(
          (i) => (i.state || "").toLowerCase() === state.toLowerCase()
        ) || results[0];

      if (match) pick(match);
      else setError(tx("Could not find {name}. Try searching for it.", { name: label }));
    } catch (err) {
      setError(tx("Search is unavailable right now. Please try again."));
    }
  };

  const submit = (event) => {
    event.preventDefault();

    if (suggestions.length > 0) pick(suggestions[0]);
  };

  return (
    <div className="dest-search">
      <form className="dest-search-box" onSubmit={submit}>
        <Search size={18} />

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tx("Search a city, e.g. Jaipur, Goa, Munnar")}
          autoComplete="off"
          aria-label={tx("Search destination")}
          autoFocus
        />

        {searching && <span className="dest-search-hint">{tx("Searching...")}</span>}
      </form>

      {suggestions.length > 0 && (
        <ul className="dest-search-results">
          {suggestions.map((item, index) => (
            <li key={item.place_id || `${item.name}-${index}`}>
              <button type="button" onClick={() => pick(item)}>
                <MapPin size={16} />

                <span>
                  <strong>{tx(item.name)}</strong>
                  <small>
                    {item.formatted ||
                      [item.city, item.state, item.country].filter(Boolean).join(", ")}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="dest-search-error">{error}</p>}

      <div className="dest-search-quick">
        <span>{tx("Popular:")}</span>

        {QUICK_DESTINATIONS.map((dest) => (
          <button key={dest.label} type="button" onClick={() => pickQuick(dest)}>
            {tx(dest.label)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DestinationSearch;
