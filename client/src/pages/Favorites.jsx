import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Hotel, MapPin } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import PageHero from "../components/PageHero";
import { getFavorites, toggleFavorite } from "../services/api";
import { useLanguage } from "../context/LanguageContext";

const Favorites = () => {
  const { t: tx } = useLanguage();

  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    getFavorites()
      .then((res) => setFavorites(res.data || []))
      .catch(() => setError(tx("Could not load your favorites. Please try again.")))
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, navigate]);

  const handleRemove = async (fav) => {
    try {
      await toggleFavorite({
        itemType: fav.itemType,
        itemId: fav.itemId,
        name: fav.name,
      });

      setFavorites((current) => current.filter((f) => f._id !== fav._id));
    } catch (err) {
      console.error("Failed to remove favorite:", err);
    }
  };

  const linkFor = (fav) =>
    fav.itemType === "place"
      ? `/place/${encodeURIComponent(fav.itemId)}${
          fav.stateSlug ? `?state=${encodeURIComponent(fav.stateSlug)}` : ""
        }`
      : "/stays";

  return (
    <div className="favorites-page">
      <PageHero
        eyebrow={tx("Saved for later")}
        icon={<Heart />}
        title={tx("My Favorites")}
        subtitle={tx("Places and stays you have saved for your next trip.")}
      />

      <div className="container favorites-body">

        {error && <p style={{ color: "#ef4444" }}>{error}</p>}

        {loading ? (
          <p>{tx("Loading your favorites...")}</p>
        ) : favorites.length === 0 ? (
          <div className="favorites-empty">
            <Heart size={40} />
            <h3>{tx("Nothing saved yet")}</h3>
            <p>{tx("Tap \"Save\" on any destination to keep it here.")}</p>
            <Link to="/state-region" className="btn btn-primary">
              {tx("Explore destinations")}
            </Link>
          </div>
        ) : (
          <div className="favorites-grid">
            {favorites.map((fav) => (
              <article key={fav._id} className="favorite-card">
                <Link to={linkFor(fav)} className="favorite-card-image">
                  {fav.image ? (
                    <img src={fav.image} alt={fav.name} loading="lazy" />
                  ) : fav.itemType === "place" ? (
                    <MapPin size={36} />
                  ) : (
                    <Hotel size={36} />
                  )}
                </Link>

                <div className="favorite-card-body">
                  <span className="favorite-card-type">{fav.itemType}</span>

                  <h3>
                    <Link to={linkFor(fav)}>{tx(fav.name)}</Link>
                  </h3>

                  {(fav.city || fav.state) && (
                    <p>{[fav.city, fav.state].filter(Boolean).join(", ")}</p>
                  )}

                  <button
                    type="button"
                    className="favorite-remove"
                    onClick={() => handleRemove(fav)}
                  >
                    {tx("Remove")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
