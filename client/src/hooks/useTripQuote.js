import { useEffect, useMemo, useState } from "react";

import { getTripQuote } from "../services/api";
import { quoteRequest } from "../utils/trip";

/**
 * The server's price for a trip (room + meals + travel + activities + taxes).
 * Pages show this instead of working prices out themselves, so what is shown
 * is exactly what the booking charges.
 */
const useTripQuote = (trip) => {
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Re-quote only when something that changes the price changes
  const requestKey = useMemo(() => JSON.stringify(quoteRequest(trip)), [trip]);

  useEffect(() => {
    const request = JSON.parse(requestKey);

    if (!request.roomId || !request.nights) return undefined;

    let active = true;
    setLoading(true);

    const timer = setTimeout(() => {
      getTripQuote(request)
        .then((res) => {
          if (!active) return;
          setQuote(res.data);
          setError("");
        })
        .catch((err) => {
          if (!active) return;
          setQuote(null);
          setError(err.response?.data?.message || "Could not calculate the price.");
        })
        .finally(() => active && setLoading(false));
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [requestKey]);

  return { quote, error, loading };
};

export default useTripQuote;
