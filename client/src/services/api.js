import axios from "axios";
import { tg } from "../i18n/runtime";

// "/api" works everywhere the site and the API share an address: in development
// (Vite forwards it to the backend) and in production when the server also
// serves the site. Set VITE_API_URL only if the API is hosted somewhere else.
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// The server answers in English. Messages shown to people ("Booking cancelled.", "Room not found.")
// are translated here, once, so every page that shows response.data.message gets the chosen language.
const translateMessage = (data) => {
  if (data && typeof data === "object" && typeof data.message === "string") data.message = tg(data.message);
};

api.interceptors.response.use(
  (response) => {
    translateMessage(response.data);

    return response;
  },
  (error) => {
    translateMessage(error.response?.data);

    return Promise.reject(error);
  }
);

// ======================================================
// HEALTH
// ======================================================

export const checkApiHealth = async () => {
  const response = await api.get("/health");

  return response.data;
};

// ======================================================
// STATES
// ======================================================

export const getStates = async (params = {}) => {
  const response = await api.get(
    "/states",
    {
      params,
    }
  );

  return response.data;
};

export const getStateById = async (
  stateId
) => {
  const response = await api.get(
    `/states/${stateId}`
  );

  return response.data;
};

// ======================================================
// GEOAPIFY LOCATION SEARCH
// ======================================================

export const searchLocations = async ({
  text,
  type = "city",
  limit = 8,
}) => {
  const response = await api.get(
    "/location/autocomplete",
    {
      params: {
        text,
        type,
        limit,
      },
    }
  );

  return response.data;
};

// ======================================================
// REAL TOURIST PLACES
// ======================================================

export const searchRealPlaces = async ({
  lat,
  lon,
  radius = 15000,
  limit = 30,
  categories,
}) => {
  const response = await api.get(
    "/location/places",
    {
      params: {
        lat,
        lon,
        radius,
        limit,
        ...(categories
          ? { categories }
          : {}),
      },
    }
  );

  return response.data;
};

// ======================================================
// REAL STAYS
// ======================================================

export const searchRealStays = async ({
  lat,
  lon,
  radius = 15000,
  limit = 30,
}) => {
  const response = await api.get(
    "/location/stays",
    {
      params: {
        lat,
        lon,
        radius,
        limit,
      },
    }
  );

  return response.data;
};

// ======================================================
// CURATED TOURIST PLACES
// ======================================================

export const getPlaces = async (
  params = {}
) => {
  const response = await api.get(
    "/places",
    {
      params,
    }
  );

  return response.data;
};

export const getPlaceById = async (
  id,
  state = ""
) => {
  const params = {};

  if (state) {
    params.state = state;
  }

  const response = await api.get(
    `/places/${encodeURIComponent(id)}`,
    {
      params,
    }
  );

  return response.data;
};

// ======================================================
// ROOM APIs
// ======================================================

export const getRoomsByStay = async (
  stayId
) => {
  const response = await api.get(
    `/rooms/stay/${stayId}`
  );

  return response.data;
};

export const getRoomById = async (
  roomId
) => {
  const response = await api.get(
    `/rooms/${roomId}`
  );

  return response.data;
};

// ======================================================
// ROOM AVAILABILITY
// ======================================================

export const checkRoomAvailability =
  async ({
    roomId,
    checkIn,
    checkOut,
    rooms,
  }) => {
    const response =
      await api.post(
        "/bookings/check-availability",
        {
          roomId,
          checkIn,
          checkOut,
          rooms,
        }
      );

    return response.data;
  };

// ======================================================
// BOOKINGS
// ======================================================

export const getMyBookings =
  async () => {
    const token =
      localStorage.getItem(
        "voyara_token"
      );

    const response =
      await api.get(
        "/bookings/my",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

    return response.data;
  };

export const createBooking =
  async (bookingData) => {
    const token =
      localStorage.getItem(
        "voyara_token"
      );

    const response =
      await api.post(
        "/bookings",
        bookingData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

    return response.data;
  };

// ======================================================
// ADD-ONS: restaurants, activities, meal plans, travel, price quote
// ======================================================

export const getNearbyRestaurants = async ({ lat, lon, radius = 1500, limit = 12 }) => {
  const response = await api.get("/addons/restaurants", {
    params: { lat, lon, radius, limit },
  });

  return response.data;
};

export const getNearbyActivities = async ({ lat, lon, radius = 6000 }) => {
  const response = await api.get("/addons/activities", {
    params: { lat, lon, radius },
  });

  return response.data;
};

export const getNearbyTransport = async ({ lat, lon, radius = 10000 }) => {
  const response = await api.get("/addons/transport", {
    params: { lat, lon, radius },
  });

  return response.data;
};

export const getAddonCatalog = async (roomPrice) => {
  const response = await api.get("/addons/catalog", { params: { roomPrice } });

  return response.data;
};

export const getTripQuote = async (trip) => {
  const response = await api.post("/addons/quote", trip);

  return response.data;
};

// ======================================================
// CANCELLATION
// ======================================================

export const getCancellationQuote = async (bookingId) => {
  const response = await api.get(`/bookings/${bookingId}/cancellation`, {
    headers: authHeaders(),
  });

  return response.data;
};

// Moves a booking to new dates. With dryRun: true it only reports the new price.
export const changeBookingDates = async (bookingId, { checkIn, checkOut, dryRun = false }) => {
  const response = await api.patch(
    `/bookings/${bookingId}/dates`,
    { checkIn, checkOut, dryRun },
    { headers: { Authorization: `Bearer ${localStorage.getItem("voyara_token")}` } }
  );

  return response.data;
};

export const cancelBookingRequest = async (bookingId) => {
  const response = await api.patch(
    `/bookings/${bookingId}/cancel`,
    {},
    { headers: authHeaders() }
  );

  return response.data;
};

// ======================================================
// ONLINE PAYMENT (Razorpay)
// ======================================================

const bearer = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("voyara_token")}` } });

// { mode: "demo" } or { mode: "razorpay", keyId }
export const getPaymentConfig = async () => {
  const response = await api.get("/bookings/payment-config");

  return response.data.data;
};

export const createPaymentOrder = async (bookingId) => {
  const response = await api.post(`/bookings/${bookingId}/payment/order`, {}, bearer());

  return response.data.data;
};

export const verifyPayment = async (bookingId, payload) => {
  const response = await api.post(`/bookings/${bookingId}/payment/verify`, payload, bearer());

  return response.data;
};

// ======================================================
// DEMO PAYMENT
// ======================================================

export const completeDemoPayment =
  async (bookingId) => {
    const token =
      localStorage.getItem(
        "voyara_token"
      );

    const response =
      await api.patch(
        `/bookings/${bookingId}/payment`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

    return response.data;
  };

// ======================================================
// REVIEWS
// ======================================================

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("voyara_token")}`,
});

export const getReviews = async (itemType, itemId, sort = "new") => {
  // a logged-in viewer is recognised so "helpful" votes show as theirs
  const token = localStorage.getItem("voyara_token");

  const response = await api.get(
    `/reviews/${itemType}/${encodeURIComponent(itemId)}`,
    {
      params: sort === "helpful" ? { sort } : {},
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  return response.data;
};

export const toggleReviewHelpful = async (reviewId) => {
  const response = await api.post(`/reviews/${reviewId}/helpful`, {}, { headers: authHeaders() });

  return response.data;
};

// files: the File objects chosen in the browser
export const uploadReviewPhotos = async (reviewId, files) => {
  const form = new FormData();

  files.forEach((file) => form.append("photos", file));

  // the browser adds the multipart boundary itself
  const response = await api.post(`/reviews/${reviewId}/photos`, form, {
    headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

export const deleteReviewPhoto = async (reviewId, index) => {
  const response = await api.delete(`/reviews/${reviewId}/photos/${index}`, { headers: authHeaders() });

  return response.data;
};

export const saveReview = async (itemType, itemId, review) => {
  const response = await api.post(
    `/reviews/${itemType}/${encodeURIComponent(itemId)}`,
    review,
    { headers: authHeaders() }
  );

  return response.data;
};

export const deleteReview = async (reviewId) => {
  const response = await api.delete(`/reviews/${reviewId}`, {
    headers: authHeaders(),
  });

  return response.data;
};

// ======================================================
// FAVORITES
// ======================================================

export const getFavorites = async () => {
  const response = await api.get("/favorites", { headers: authHeaders() });

  return response.data;
};

export const toggleFavorite = async (item) => {
  const response = await api.post("/favorites/toggle", item, {
    headers: authHeaders(),
  });

  return response.data;
};

// ======================================================
// CONTACT
// ======================================================

/** Sends a message from the Contact page. Works for guests; a logged-in visitor's account is attached. */
export const sendContactMessage = async (payload) => {
  const token = localStorage.getItem("voyara_token");

  const response = await api.post("/contact", payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return response.data;
};

export const getAdminMessages = async () => {
  const response = await api.get("/admin/messages", { headers: authHeaders() });

  return response.data;
};

export const markMessageRead = async (id) => {
  const response = await api.patch(`/admin/messages/${id}/read`, {}, { headers: authHeaders() });

  return response.data;
};

// ======================================================
// ADMIN: bookings, travelers, revenue
// ======================================================

export const getAdminBookingsPage = async (params = {}) => {
  const response = await api.get("/admin/bookings", { params, headers: authHeaders() });

  return response.data;
};

// Saves the filtered bookings as a CSV file in the browser
export const downloadBookingsCsv = async (params = {}) => {
  const response = await api.get("/admin/bookings/export", { params, headers: authHeaders(), responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");

  link.href = url;
  link.download = `voyara-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const adminCancelBooking = async (bookingId, body = {}) => {
  const response = await api.patch(`/admin/bookings/${bookingId}/cancel`, body, { headers: authHeaders() });

  return response.data;
};

export const getAdminUsers = async (q = "") => {
  const response = await api.get("/admin/users", { params: q ? { q } : {}, headers: authHeaders() });

  return response.data;
};

export const setUserRole = async (userId, role) => {
  const response = await api.patch(`/admin/users/${userId}/role`, { role }, { headers: authHeaders() });

  return response.data;
};

export const getRevenueSeries = async (range = "30d") => {
  const response = await api.get("/admin/revenue", { params: { range }, headers: authHeaders() });

  return response.data;
};

// ======================================================
// TRAVEL ASSISTANT
// ======================================================

export const askAssistant = async (message) => {
  const token = localStorage.getItem("voyara_token");
  const response = await api.post(
    "/assistant",
    { message },
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

  return response.data;
};

// ======================================================
// DEFAULT API INSTANCE
// ======================================================

export default api;