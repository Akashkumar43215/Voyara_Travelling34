import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, ExternalLink, MapPin, Search } from "lucide-react";

import { getNearbyActivities, getNearbyTransport, searchLocations } from "../services/api";
import { distanceMeters, formatMeters } from "../utils/geo";

// A small map built from OpenStreetMap picture tiles: a 5 x 3 block of tiles with the hotel in the middle.
// Pictures need no script and are allowed by the site's security policy (map frames are not).
const ZOOM = 13;
const TILE = 256;
const COLUMNS = 5;
const ROWS = 3;

const tilePoint = (lat, lon) => {
  const n = 2 ** ZOOM;
  const rad = (lat * Math.PI) / 180;

  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  };
};

const walkOrDistance = (meters) => (meters < 1500 ? `${Math.max(1, Math.round(meters / 80))} min walk` : formatMeters(meters));

const mapsDirections = (stay, place) =>
  `https://www.google.com/maps/dir/?api=1&origin=${stay.latitude},${stay.longitude}&destination=${place.latitude},${place.longitude}`;

/**
 * Location block of the hotel page: address, a searchable list of landmarks and transport with
 * distances from the hotel, and a map that shows the ticked ones (and, if asked, other hotels).
 * Everything comes from the map data: nothing here is generated.
 */
const StayLocation = ({ stay, others = [] }) => {
  const [tab, setTab] = useState("landmarks");
  const [landmarks, setLandmarks] = useState({ loading: true, data: [] });
  const [transport, setTransport] = useState({ loading: true, data: [] });
  const [ticked, setTicked] = useState([]);
  const [showHotels, setShowHotels] = useState(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [picked, setPicked] = useState(null);

  const hasPoint = Number.isFinite(Number(stay.latitude)) && Number.isFinite(Number(stay.longitude));

  useEffect(() => {
    if (!hasPoint) return undefined;

    let active = true;
    const point = { lat: stay.latitude, lon: stay.longitude };

    setLandmarks({ loading: true, data: [] });
    setTransport({ loading: true, data: [] });
    setTicked([]);
    setPicked(null);

    getNearbyActivities({ ...point, radius: 15000 })
      .then((res) => active && setLandmarks({ loading: false, data: res.data?.nearby || [] }))
      .catch(() => active && setLandmarks({ loading: false, data: [] }));

    getNearbyTransport(point)
      .then((res) => active && setTransport({ loading: false, data: res.data || [] }))
      .catch(() => active && setTransport({ loading: false, data: [] }));

    return () => {
      active = false;
    };
  }, [stay.placeId, stay.latitude, stay.longitude, hasPoint]);

  // "Search distance from any location": suggestions come from the map's place search
  useEffect(() => {
    const text = query.trim();

    if (text.length < 3) {
      setSuggestions([]);
      return undefined;
    }

    let active = true;

    const timer = setTimeout(() => {
      Promise.all([searchLocations({ text, type: "amenity", limit: 5 }), searchLocations({ text, type: "city", limit: 3 })])
        .then(([a, b]) => {
          if (!active) return;

          const seen = new Set();

          setSuggestions(
            [...(a.data || []), ...(b.data || [])]
              .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon) && r.formatted && !seen.has(r.formatted) && seen.add(r.formatted))
              .slice(0, 6)
          );
        })
        .catch(() => active && setSuggestions([]));
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const rows = useMemo(() => {
    const source = tab === "landmarks" ? landmarks.data : transport.data;

    const list = source
      .map((p) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        latitude: p.latitude,
        longitude: p.longitude,
        meters: distanceMeters(stay.latitude, stay.longitude, p.latitude, p.longitude),
      }))
      .filter((p) => p.meters != null)
      .sort((a, b) => a.meters - b.meters);

    if (tab === "landmarks" && picked) {
      return [{ ...picked, meters: distanceMeters(stay.latitude, stay.longitude, picked.latitude, picked.longitude) }, ...list];
    }

    return list;
  }, [tab, landmarks, transport, picked, stay.latitude, stay.longitude]);

  const toggle = (id) => setTicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const choose = (r) => {
    const place = {
      id: `picked:${r.formatted}`,
      name: r.name || r.address_line1 || r.formatted,
      kind: "Searched",
      latitude: r.lat,
      longitude: r.lon,
    };

    setPicked(place);
    setTab("landmarks");
    setTicked((list) => [...list, place.id]);
    setQuery("");
    setSuggestions([]);
  };

  if (!hasPoint) {
    return (
      <>
        <h3 className="hd-h">Location</h3>
        <p className="hotel-locality"><MapPin size={14} /> {stay.address || stay.city}</p>
      </>
    );
  }

  // Map geometry: pixel position of any point inside the tile block
  const centre = tilePoint(stay.latitude, stay.longitude);
  const firstX = Math.floor(centre.x) - Math.floor(COLUMNS / 2);
  const firstY = Math.floor(centre.y) - Math.floor(ROWS / 2);
  const toPixels = (lat, lon) => {
    const p = tilePoint(lat, lon);

    return { left: (p.x - firstX) * TILE, top: (p.y - firstY) * TILE };
  };
  const hotelPixels = toPixels(stay.latitude, stay.longitude);

  const tiles = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLUMNS; col += 1) {
      tiles.push({ key: `${col}-${row}`, x: firstX + col, y: firstY + row, col, row });
    }
  }

  const pins = [...landmarks.data, ...transport.data, ...(picked ? [picked] : [])].filter((p) => ticked.includes(p.id));
  const otherHotels = showHotels
    ? others.filter((o) => o.placeId !== stay.placeId && Number.isFinite(Number(o.latitude)) && Number.isFinite(Number(o.longitude))).slice(0, 20)
    : [];

  const loading = tab === "landmarks" ? landmarks.loading : transport.loading;

  return (
    <div className="sl">
      <h3 className="hd-h">Location</h3>
      <p className="sl-address"><strong>Address:</strong> {stay.address || stay.city}</p>

      <div className="sl-body">
        <div className="sl-panel">
          <div className="sl-search">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search distance from any location${stay.city ? ` in ${stay.city}` : ""}`}
              aria-label="Search a location"
              maxLength={80}
            />
            <Search size={16} />

            {suggestions.length > 0 && (
              <ul className="sl-suggest">
                {suggestions.map((r) => (
                  <li key={r.formatted}>
                    <button type="button" onClick={() => choose(r)}>
                      <strong>{r.name || r.address_line1}</strong>
                      <small>{r.address_line2 || r.formatted}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sl-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "landmarks"} className={tab === "landmarks" ? "active" : ""} onClick={() => setTab("landmarks")}>Key Landmarks</button>
            <button type="button" role="tab" aria-selected={tab === "transport"} className={tab === "transport" ? "active" : ""} onClick={() => setTab("transport")}>Transport</button>
          </div>

          <ul className="sl-list">
            {loading && <li className="sl-note">Finding places near the hotel...</li>}
            {!loading && rows.length === 0 && <li className="sl-note">Nothing was found nearby in the map data.</li>}

            {rows.map((row) => (
              <li key={row.id}>
                <label>
                  <input type="checkbox" checked={ticked.includes(row.id)} onChange={() => toggle(row.id)} />
                  <span className="sl-name">
                    {row.name}
                    <small>{row.kind}</small>
                  </span>
                  <span className="sl-dist">{walkOrDistance(row.meters)}</span>
                </label>
                <a href={mapsDirections(stay, row)} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${row.name}`}>
                  <ChevronRight size={16} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="sl-map">
          <div className="sl-tiles" style={{ transform: `translate(${-hotelPixels.left}px, ${-hotelPixels.top}px)` }}>
            {tiles.map((t) => (
              <img
                key={t.key}
                src={`https://tile.openstreetmap.org/${ZOOM}/${t.x}/${t.y}.png`}
                alt=""
                width={TILE}
                height={TILE}
                style={{ left: t.col * TILE, top: t.row * TILE }}
                loading="lazy"
                draggable="false"
              />
            ))}

            {otherHotels.map((o) => {
              const at = toPixels(Number(o.latitude), Number(o.longitude));

              return <span key={o.placeId} className="sl-pin hotel" style={at} title={o.name} />;
            })}

            {pins.map((p) => {
              const at = toPixels(Number(p.latitude), Number(p.longitude));

              return (
                <span key={p.id} className="sl-pin place" style={at}>
                  <i>{p.name}</i>
                </span>
              );
            })}

            <span className="sl-pin you" style={hotelPixels} title={stay.name}>
              <MapPin size={30} fill="currentColor" />
            </span>
          </div>

          <label className="sl-nearby">
            <input type="checkbox" checked={showHotels} onChange={(e) => setShowHotels(e.target.checked)} />
            Nearby Hotels
          </label>

          <a
            className="sl-open"
            href={`https://www.google.com/maps/search/?api=1&query=${stay.latitude},${stay.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open full map <ExternalLink size={13} />
          </a>

          <span className="sl-credit">© OpenStreetMap contributors</span>
        </div>
      </div>
    </div>
  );
};

export default StayLocation;
