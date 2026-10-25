import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE = "VOYARA";

// Longest prefixes first, so "/places/goa" matches "/places" and not "/"
const TITLES = [
  ["/about", "About us"],
  ["/contact", "Contact us"],
  ["/state-region", "Explore all 36 States & UTs"],
  ["/places", "Places to visit"],
  ["/place", "Place details"],
  ["/real-places", "Nearby tourist places"],
  ["/stays", "Hotels & stays"],
  ["/dates", "Choose your room"],
  ["/availability", "Room availability"],
  ["/meals", "Meals & facilities"],
  ["/add-ons", "Travel & activities"],
  ["/trip-builder", "Trip preview"],
  ["/booking-details", "Traveler details"],
  ["/trip-review", "Review your booking"],
  ["/payment", "Payment"],
  ["/trip-confirmation", "Booking confirmed"],
  ["/trips", "My trips"],
  ["/favorites", "My favorites"],
  ["/login", "Login"],
  ["/register", "Create an account"],
  ["/admin", "Admin"],
];

/** Keeps the browser tab title in step with the page, for tabs, history and bookmarks. */
const RouteTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const match = TITLES.filter(([path]) => pathname === path || pathname.startsWith(`${path}/`)).sort(
      (a, b) => b[0].length - a[0].length
    )[0];

    document.title = match ? `${match[1]} | ${SITE}` : `${SITE} | Smart Travel India`;
  }, [pathname]);

  return null;
};

export default RouteTitle;
