import React, { Suspense, lazy } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Skeleton from "./components/Skeleton";
import { EmptyState } from "./components/StateMessage";

import Navbar from "./components/Navbar";
import TripCartBar from "./components/TripCartBar";
import AnnouncementBar from "./components/AnnouncementBar";
import Footer from "./components/Footer";
import RequireLogin from "./components/RequireLogin";
import ScrollToTop from "./components/ScrollToTop";
import RouteTitle from "./components/RouteTitle";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollProgress from "./components/ScrollProgress";
import AssistantWidget from "./components/AssistantWidget";
import useScrollReveal from "./hooks/useScrollReveal";
import { AuthProvider } from "./context/AuthContext";

// The home page loads straight away; every other page loads when first visited,
// which keeps the first download small and fast.
import Home from "./pages/Home";

import { tg } from "./i18n/runtime";
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const StateRegion = lazy(() => import("./pages/StateRegion"));
const Places = lazy(() => import("./pages/Places"));
const PlaceDetails = lazy(() => import("./pages/PlaceDetails"));
const RealPlaces = lazy(() => import("./pages/RealPlaces"));
const Stays = lazy(() => import("./pages/Stays"));
const Dates = lazy(() => import("./pages/Dates"));
const Availability = lazy(() => import("./pages/Availability"));
const MealsFacilities = lazy(() => import("./pages/MealsFacilities"));
const TravelActivities = lazy(() => import("./pages/TravelActivities"));
const TripBuilder = lazy(() => import("./pages/TripBuilder"));
const TripCheckout = lazy(() => import("./pages/TripCheckout"));
const BookingDetails = lazy(() => import("./pages/BookingDetails"));
const TripReview = lazy(() => import("./pages/TripReview"));
const Payment = lazy(() => import("./pages/Payment"));
const TripConfirmation = lazy(() => import("./pages/TripConfirmation"));
const MyTrips = lazy(() => import("./pages/MyTrips"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const PageLoader = () => (
  <div className="page-loader" role="status" aria-live="polite">
    <div style={{ display: "grid", gap: "0.75rem", width: "min(560px, 90vw)" }}>
      <Skeleton height="2.25rem" width="55%" />
      <Skeleton height="1rem" />
      <Skeleton height="1rem" width="85%" />
      <Skeleton height="9rem" plate />
    </div>
    <span>{tg("Loading...")}</span>
  </div>
);

const NotFound = () => (
  <EmptyState
    title={tg("Page Not Found")}
    text={tg("The page you are looking for does not exist in VOYARA.")}
    action={{ label: tg("Return to Home"), to: "/" }}
  />
);

const guarded = (page) => <RequireLogin>{page}</RequireLogin>;

function App() {
  const location = useLocation();

  // cards and headings fade up as they scroll into view
  useScrollReveal();

  return (
    <AuthProvider>
      <RouteTitle />
      <ScrollProgress />

      <div className="app-layout">
        <AnnouncementBar />
        <TripCartBar />
        <Navbar />

        <main className="main-content">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <div key={location.pathname} className="page-transition">
              <Routes>
                <Route path="/" element={<Home />} />

                {/* Company */}
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />

                {/* Explore */}
                <Route path="/state-region" element={<StateRegion />} />
                <Route path="/places/:stateId" element={<Places />} />
                <Route path="/real-places" element={<RealPlaces />} />
                <Route path="/place/:placeId" element={<PlaceDetails />} />

                {/* Plan: stay, room, meals, travel, preview */}
                <Route path="/stays" element={<Stays />} />
                <Route path="/dates" element={<Dates />} />
                <Route path="/availability" element={<Availability />} />
                <Route path="/meals" element={<MealsFacilities />} />
                <Route path="/add-ons" element={<TravelActivities />} />
                <Route path="/trip-builder" element={<TripBuilder />} />

                {/* Book: needs an account */}
                <Route path="/trip-checkout" element={guarded(<TripCheckout />)} />
                <Route path="/booking-details" element={guarded(<BookingDetails />)} />
                <Route path="/trip-review" element={guarded(<TripReview />)} />
                <Route path="/payment" element={guarded(<Payment />)} />
                <Route path="/trip-confirmation" element={<TripConfirmation />} />

                {/* Account */}
                <Route path="/trips" element={<MyTrips />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/admin" element={<AdminDashboard />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
              </div>
            </Suspense>
          </ErrorBoundary>
        </main>

        <Footer />

        {/* Back-to-top button + start every page at the top */}
        <ScrollToTop />
        <AssistantWidget />
      </div>
    </AuthProvider>
  );
}

export default App;
