import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Minus,
  Plus,
  MapPin,
  Hotel,
  Users,
  BedDouble,
  Check,
} from "lucide-react";

import { getRoomsByStay } from "../services/api";

import PageHero from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { dateLocale } from "../i18n/runtime";
const Dates = () => {
  const { t: tx } = useLanguage();

  const location = useLocation();
  const navigate = useNavigate();

  // ======================================================
  // TRIP DATA
  // ======================================================

  const selectedLocation =
    location.state?.location || null;

  const selectedPlaces =
    location.state?.selectedPlaces || [];

  const selectedStay =
    location.state?.selectedStay || null;

  // ======================================================
  // ROOM DATA
  // ======================================================

  const [roomList, setRoomList] = useState([]);
  const [selectedRoom, setSelectedRoom] =
    useState(null);

  const [roomsLoading, setRoomsLoading] =
    useState(true);

  const [roomsError, setRoomsError] =
    useState("");

  // ======================================================
  // FETCH ROOMS FROM MONGODB
  // ======================================================

  useEffect(() => {
    let isMounted = true;

    const fetchRooms = async () => {
      if (!selectedStay) {
        setRoomsLoading(false);
        return;
      }

      // We need the MongoDB Stay ID.
      const stayId =
        selectedStay.mongoStayId ||
        selectedStay.stayId ||
        selectedStay._id;

      if (!stayId) {
        setRoomsLoading(false);
        setRoomsError(
          tx("This accommodation has not been saved in VOYARA yet.")
        );
        return;
      }

      try {
        setRoomsLoading(true);
        setRoomsError("");

        const response =
          await getRoomsByStay(stayId);

        if (!isMounted) {
          return;
        }

        if (!response.success) {
          setRoomsError(
            response.message ||
              tx("Unable to load rooms.")
          );

          setRoomList([]);
          return;
        }

        const rooms =
          response.rooms || [];

        setRoomList(rooms);

        // Automatically select the first available room.
        const firstAvailableRoom =
          rooms.find(
            (room) =>
              room.isActive &&
              Number(room.availableRooms) > 0
          );

        setSelectedRoom(
          firstAvailableRoom || null
        );
      } catch (error) {
        console.error(
          "Room Fetch Error:",
          error
        );

        if (isMounted) {
          setRoomsError(
            tx("Unable to load rooms right now. Please try again.")
          );

          setRoomList([]);
          setSelectedRoom(null);
        }
      } finally {
        if (isMounted) {
          setRoomsLoading(false);
        }
      }
    };

    fetchRooms();

    return () => {
      isMounted = false;
    };
  }, [selectedStay]);

  // ======================================================
  // DEFAULT DATES
  // ======================================================

  const tomorrow = useMemo(() => {
    const date = new Date();

    date.setDate(
      date.getDate() + 1
    );

    return formatDateForInput(date);
  }, []);

  const dayAfterTomorrow = useMemo(() => {
    const date = new Date();

    date.setDate(
      date.getDate() + 2
    );

    return formatDateForInput(date);
  }, []);

  // Start from the dates and guests chosen earlier (home page / hotel search)
  const incoming = location.state || {};

  const [checkIn, setCheckIn] =
    useState(incoming.checkIn || tomorrow);

  const [checkOut, setCheckOut] =
    useState(incoming.checkOut || dayAfterTomorrow);

  // ======================================================
  // GUEST DETAILS
  // ======================================================

  const [rooms, setRooms] =
    useState(Number(incoming.rooms) || 1);

  const [adults, setAdults] =
    useState(Number(incoming.adults) || 2);

  const [children, setChildren] =
    useState(Number(incoming.children) || 0);

  // ======================================================
  // DATE VALIDATION
  // ======================================================

  const today =
    formatDateForInput(new Date());

  const dateError = useMemo(() => {
    if (!checkIn || !checkOut) {
      return "";
    }

    if (checkIn < today) {
      return tx("Check-in date cannot be before today.");
    }

    if (checkOut <= checkIn) {
      return tx("Check-out date must be after check-in.");
    }

    return "";
  }, [
    checkIn,
    checkOut,
    today,
  ]);

  // ======================================================
  // NIGHTS
  // ======================================================

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) {
      return 0;
    }

    const start = new Date(
      `${checkIn}T00:00:00`
    );

    const end = new Date(
      `${checkOut}T00:00:00`
    );

    const difference =
      end.getTime() -
      start.getTime();

    return Math.max(
      0,
      Math.round(
        difference /
          (1000 * 60 * 60 * 24)
      )
    );
  }, [
    checkIn,
    checkOut,
  ]);

  // ======================================================
  // ROOM COUNTER
  // ======================================================

  const maxAvailableRooms =
    selectedRoom
      ? Number(
          selectedRoom.availableRooms
        ) || 1
      : 1;

  const increaseRooms = () => {
    setRooms((current) =>
      Math.min(
        current + 1,
        maxAvailableRooms
      )
    );
  };

  const decreaseRooms = () => {
    setRooms((current) =>
      Math.max(
        current - 1,
        1
      )
    );
  };

  // ======================================================
  // ADULT COUNTER
  // ======================================================

  const increaseAdults = () => {
    setAdults((current) =>
      Math.min(
        current + 1,
        20
      )
    );
  };

  const decreaseAdults = () => {
    setAdults((current) =>
      Math.max(
        current - 1,
        rooms
      )
    );
  };

  // ======================================================
  // CHILDREN COUNTER
  // ======================================================

  const increaseChildren = () => {
    setChildren((current) =>
      Math.min(
        current + 1,
        10
      )
    );
  };

  const decreaseChildren = () => {
    setChildren((current) =>
      Math.max(
        current - 1,
        0
      )
    );
  };

  // ======================================================
  // SELECT ROOM
  // ======================================================

  const handleSelectRoom = (room) => {
    if (
      !room.isActive ||
      Number(room.availableRooms) <= 0
    ) {
      return;
    }

    setSelectedRoom(room);

    // Reset number of rooms when changing room type.
    setRooms(1);

    // Make sure adults are enough.
    if (adults < 1) {
      setAdults(1);
    }
  };

  // ======================================================
  // CONTINUE
  // ======================================================

  const handleContinue = () => {
    if (dateError) {
      return;
    }

    if (!selectedRoom) {
      return;
    }

    if (
      rooms >
      Number(
        selectedRoom.availableRooms
      )
    ) {
      return;
    }

    if (
      adults <
      rooms
    ) {
      return;
    }

    if (
      adults + children >
      Number(selectedRoom.maxGuests) *
        rooms
    ) {
      return;
    }

    navigate(
      "/availability",
      {
        state: {
          location:
            selectedLocation,

          selectedPlaces,

          selectedStay,

          selectedRoom,

          checkIn,

          checkOut,

          rooms,

          adults,

          children,

          nights,
        },
      }
    );
  };

  // ======================================================
  // NO DESTINATION
  // ======================================================

  if (
    !selectedLocation ||
    !selectedStay
  ) {
    return (
      <div className="real-places-empty">
        <CalendarDays size={44} />

        <h2>
          {tx("Trip details are missing")}
        </h2>

        <p>
          {tx("Please select a destination, tourist places, and accommodation before choosing dates.")}
        </p>

        <button
          className="btn btn-primary"
          onClick={() =>
            navigate("/")
          }
        >
          <ArrowLeft size={17} />
          {tx("Back to Home")}
        </button>
      </div>
    );
  }

  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <div className="dates-page">
      <PageHero
        compact
        eyebrow={tx("STEP 2 OF 9 · TRIP DETAILS")}
        icon={<MapPin />}
        title={tx("Plan Your Stay")}
        subtitle={
          <> {tx("Select your room, travel dates, and number of guests.")} <br />
            <MapPin size={15} />{" "}
            {(selectedLocation.formatted ||
              [selectedLocation.city, selectedLocation.state, selectedLocation.country]
                .filter(Boolean)
                .join(", "))
              .split(", ")
              .map((part) => tx(part))
              .join(", ")}
          </>
        }
        actions={
          <button className="page-hero-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
            {tx("Back to Stays")}
          </button>
        }
      />

      <section className="section">
        <div className="container">

          {/* ==================================================
              SELECTED STAY
          ================================================== */}

          <div className="dates-selected-stay">

            <div className="dates-selected-stay-icon">
              <Hotel size={28} />
            </div>

            <div>
              <span>
                {tx("Selected Stay")}
              </span>

              <h3>
                {tx(selectedStay.name)}
              </h3>

              {selectedStay.address && (
                <p>
                  {selectedStay.address}
                </p>
              )}
            </div>

          </div>

          {/* ==================================================
              SELECTED PLACES
          ================================================== */}

          {selectedPlaces.length >
            0 && (
            <div className="dates-selected-places">

              <h3>
                {tx("Your Selected Tourist Places")}
              </h3>

              <div>
                {selectedPlaces.map(
                  (
                    place,
                    index
                  ) => (
                    <span
                      key={
                        place.placeId ||
                        `${place.name}-${index}`
                      }
                    >
                      <MapPin
                        size={14}
                      />

                      {tx(place.name)}
                    </span>
                  )
                )}
              </div>

            </div>
          )}

          {/* ==================================================
              ROOM SELECTION
          ================================================== */}

          <div className="dates-form-card">

            <div className="dates-form-heading">

              <BedDouble
                size={24}
              />

              <div>
                <h2>
                  {tx("Choose Your Room")}
                </h2>

                <p>
                  {tx("Select a room from the available inventory.")}
                </p>
              </div>

            </div>

            {/* LOADING */}

            {roomsLoading && (
              <div className="dates-room-status">
                {tx("Loading available rooms...")}
              </div>
            )}

            {/* ERROR */}

            {!roomsLoading &&
              roomsError && (
                <div className="dates-error">
                  {roomsError}
                </div>
              )}

            {/* ROOMS */}

            {!roomsLoading &&
              !roomsError &&
              roomList.length ===
                0 && (
                <div className="dates-room-status">
                  {tx("No rooms are available for this stay.")}
                </div>
              )}

            {!roomsLoading &&
              !roomsError &&
              roomList.length > 0 && (
                <div className="dates-room-list">

                  {roomList.map(
                    (room) => {
                      const isSelected =
                        selectedRoom?._id ===
                        room._id;

                      const isAvailable =
                        room.isActive &&
                        Number(
                          room.availableRooms
                        ) > 0;

                      return (
                        <button
                          key={
                            room._id
                          }
                          type="button"
                          className={`dates-room-card ${
                            isSelected
                              ? "selected"
                              : ""
                          } ${
                            !isAvailable
                              ? "disabled"
                              : ""
                          }`}
                          onClick={() =>
                            handleSelectRoom(
                              room
                            )
                          }
                          disabled={
                            !isAvailable
                          }
                        >

                          <div className="dates-room-card-top">

                            <div>
                              <h3>
                                {
                                  tx(room.name)
                                }
                              </h3>

                              <p>
                                {
                                  tx(room.description)
                                }
                              </p>
                            </div>

                            {isSelected && (
                              <span className="dates-room-selected">
                                <Check
                                  size={
                                    16
                                  }
                                />
                                {tx("Selected")}
                              </span>
                            )}

                          </div>

                          <div className="dates-room-details">

                            <strong>
                              ₹
                              {Number(
                                room.pricePerNight
                              ).toLocaleString(
                                "en-IN"
                              )}
                              <small> {tx("/ night")} </small>
                            </strong>

                            <span> <Users size={15} /> {tx("Max {n} guests", { n: room.maxGuests })} </span>

                            <span>{tx("{n} available", { n: room.availableRooms })}</span>

                          </div>

                          {room.amenities
                            ?.length >
                            0 && (
                            <div className="dates-room-amenities">
                              {room.amenities
                                .slice(
                                  0,
                                  4
                                )
                                .map(
                                  (
                                    amenity
                                  ) => (
                                    <span
                                      key={
                                        amenity
                                      }
                                    >
                                      ✓{" "}
                                      {
                                        tx(amenity)
                                      }
                                    </span>
                                  )
                                )}
                            </div>
                          )}

                        </button>
                      );
                    }
                  )}

                </div>
              )}

          </div>

          {/* ==================================================
              DATE CARD
          ================================================== */}

          <div className="dates-form-card">

            <div className="dates-form-heading">

              <CalendarDays
                size={24}
              />

              <div>
                <h2>
                  {tx("Travel Dates")}
                </h2>

                <p>
                  {tx("Choose when you want to stay.")}
                </p>
              </div>

            </div>

            <div className="dates-grid">

              {/* CHECK-IN */}

              <div className="date-field">

                <label htmlFor="checkIn">
                  {tx("Check-in")}
                </label>

                <input
                  id="checkIn"
                  type="date"
                  min={today}
                  value={checkIn}
                  onChange={(e) =>
                    setCheckIn(
                      e.target.value
                    )
                  }
                />

              </div>

              {/* CHECK-OUT */}

              <div className="date-field">

                <label htmlFor="checkOut">
                  {tx("Check-out")}
                </label>

                <input
                  id="checkOut"
                  type="date"
                  min={
                    checkIn ||
                    today
                  }
                  value={checkOut}
                  onChange={(e) =>
                    setCheckOut(
                      e.target.value
                    )
                  }
                />

              </div>

            </div>

            {dateError && (
              <div className="dates-error">
                {dateError}
              </div>
            )}

          </div>

          {/* ==================================================
              GUEST CARD
          ================================================== */}

          <div className="dates-form-card">

            <div className="dates-form-heading">

              <Hotel size={24} />

              <div>
                <h2>
                  {tx("Rooms & Guests")}
                </h2>

                <p>
                  {tx("Tell us who is travelling.")}
                </p>
              </div>

            </div>

            {/* ROOMS */}

            <CounterRow
              title={tx("Rooms")}
              description={tx("Number of rooms required")}
              value={rooms}
              onDecrease={
                decreaseRooms
              }
              onIncrease={
                increaseRooms
              }
              minimum={1}
            />

            {/* ADULTS */}

            <CounterRow
              title={tx("Adults")}
              description={tx("Guests aged 13 and above")}
              value={adults}
              onDecrease={
                decreaseAdults
              }
              onIncrease={
                increaseAdults
              }
              minimum={1}
            />

            {/* CHILDREN */}

            <CounterRow
              title={tx("Children")}
              description={tx("Guests aged 0–12")}
              value={children}
              onDecrease={
                decreaseChildren
              }
              onIncrease={
                increaseChildren
              }
              minimum={0}
            />

            {/* GUEST CAPACITY WARNING */}

            {selectedRoom &&
              adults +
                children >
                Number(
                  selectedRoom.maxGuests
                ) *
                  rooms && (
                <div className="dates-error">{tx("This room supports a maximum of {n} guests for {rooms} room(s).", { n: Number(selectedRoom.maxGuests) * rooms, rooms })}</div>
              )}

          </div>

          {/* ==================================================
              SUMMARY
          ================================================== */}

          <div className="dates-summary-card">

            <div>

              <span>
                {tx("Trip Summary")}
              </span>

              <h3>
                {formatDisplayDate(
                  checkIn
                )}

                {" → "}

                {formatDisplayDate(
                  checkOut
                )}
              </h3>

            </div>

            <div className="dates-summary-details">

              {selectedRoom && (
                <span>
                  {tx(selectedRoom.name)}
                </span>
              )}

              <span>
                {nights}{" "}
                {nights === 1
                  ? tx("Night")
                  : tx("Nights")}
              </span>

              <span>
                {rooms}{" "}
                {rooms === 1
                  ? tx("Room")
                  : tx("Rooms")}
              </span>

              <span>
                {adults}{" "}
                {adults === 1
                  ? tx("Adult")
                  : tx("Adults")}
              </span>

              <span>
                {children}{" "}
                {children === 1
                  ? tx("Child")
                  : tx("Children")}
              </span>

            </div>

          </div>

          {/* ==================================================
              CONTINUE
          ================================================== */}

          <div className="dates-actions">

            <button
              className="btn btn-primary"
              disabled={
                Boolean(
                  dateError
                ) ||
                !selectedRoom ||
                roomsLoading ||
                Boolean(
                  roomsError
                ) ||
                adults +
                  children >
                  Number(
                    selectedRoom?.maxGuests ||
                      0
                  ) *
                    rooms
              }
              onClick={
                handleContinue
              }
            >
              {tx("Search Availability")}

              <ArrowRight
                size={17}
              />
            </button>

          </div>

        </div>
      </section>
    </div>
  );
};

// ======================================================
// COUNTER COMPONENT
// ======================================================

const CounterRow = ({
  title,
  description,
  value,
  onDecrease,
  onIncrease,
  minimum,
}) => {
  const { t: tx } = useLanguage();

  return (
    <div className="counter-row">

      <div className="counter-info">

        <strong>
          {tx(title)}
        </strong>

        <span>
          {tx(description)}
        </span>

      </div>

      <div className="counter-controls">

        <button
          type="button"
          onClick={
            onDecrease
          }
          disabled={
            value <= minimum
          }
          aria-label={`Decrease ${title}`}
        >
          <Minus size={16} />
        </button>

        <strong>
          {tx(value)}
        </strong>

        <button
          type="button"
          onClick={
            onIncrease
          }
          aria-label={`Increase ${title}`}
        >
          <Plus size={16} />
        </button>

      </div>

    </div>
  );
};

// ======================================================
// HELPERS
// ======================================================

const formatDateForInput = (
  date
) => {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (
  dateString
) => {
  if (!dateString) {
    return "--";
  }

  const date = new Date(
    `${dateString}T00:00:00`
  );

  return date.toLocaleDateString(dateLocale(),
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};

export default Dates;