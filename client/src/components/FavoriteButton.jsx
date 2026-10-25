import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { getFavorites, toggleFavorite } from "../services/api";
import { useLanguage } from "../context/LanguageContext";

/**
 * Heart button that saves or removes a place/stay from the user's favorites.
 * `item` must include itemType, itemId and name (image, city, state, stateSlug optional).
 */
const FavoriteButton = ({ item, className = "" }) => {
  const { t: tx } = useLanguage();

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setSaved(false);
      return undefined;
    }

    let active = true;

    getFavorites()
      .then((res) => {
        if (!active) return;

        setSaved(
          (res.data || []).some(
            (fav) =>
              fav.itemType === item.itemType &&
              fav.itemId === String(item.itemId)
          )
        );
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isAuthenticated, item.itemType, item.itemId]);

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (busy) return;

    setBusy(true);

    try {
      const res = await toggleFavorite(item);
      setSaved(Boolean(res.favorited));
    } catch (error) {
      console.error("Favorite toggle failed:", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`favorite-btn ${saved ? "saved" : ""} ${className}`}
      onClick={handleClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? tx("Remove from favorites") : tx("Save to favorites")}
    >
      <Heart size={18} fill={saved ? "currentColor" : "none"} />
      <span>{saved ? tx("Saved") : tx("Save")}</span>
    </button>
  );
};

export default FavoriteButton;
