import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Route, X } from "lucide-react";

import { cityOf, clearCart, getCart, onCartChange } from "../utils/tripCart";

// these pages deal with the trip themselves
const HIDE_ON = ["/trip-checkout", "/payment", "/trip-confirmation", "/admin"];

/** A slim reminder under the navbar while a multi-city trip has saved stops: where they are and how to finish. */
const TripCartBar = () => {
  const { pathname } = useLocation();
  const [cart, setCart] = useState(getCart);

  useEffect(() => onCartChange(() => setCart(getCart())), []);

  if (cart.legs.length === 0 || HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <div className="cartbar" role="status">
      <div className="cartbar-inner">
        <Route size={16} aria-hidden="true" />

        <span className="cartbar-text">
          <strong>Multi-city trip:</strong> {cart.legs.map(cityOf).join(" → ")}
        </span>

        <Link to="/trip-checkout" className="cartbar-go">
          Finish this trip <ArrowRight size={14} />
        </Link>

        <button type="button" className="cartbar-clear" onClick={clearCart} aria-label="Discard the saved cities">
          <X size={15} />
        </button>
      </div>
    </div>
  );
};

export default TripCartBar;
