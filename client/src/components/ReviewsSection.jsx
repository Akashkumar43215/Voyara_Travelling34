import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Star, ThumbsUp, Trash2, X } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  deleteReview,
  deleteReviewPhoto,
  getReviews,
  saveReview,
  toggleReviewHelpful,
  uploadReviewPhotos,
} from "../services/api";
import { dateLocale } from "../i18n/runtime";

const RATING_LABELS = { 5: "Excellent", 4: "Very Good", 3: "Average", 2: "Poor", 1: "Bad" };

// Same bands the hotel list uses for its overall label
const overallLabel = (average) => (average >= 4.5 ? "Excellent" : average >= 4 ? "Very Good" : average >= 3.5 ? "Good" : "Average");

const MAX_PHOTOS = 3;
const MAX_PHOTO_MB = 3;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const StarRow = ({ value, onChange, size = 18 }) => (
  <div className="stars" role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        className={`star ${n <= value ? "on" : ""}`}
        onClick={onChange ? () => onChange(n) : undefined}
        disabled={!onChange}
        aria-label={`${n} star${n > 1 ? "s" : ""}`}
      >
        <Star size={size} fill={n <= value ? "currentColor" : "none"} />
      </button>
    ))}
  </div>
);

/**
 * Traveler reviews for a place or stay: list, average, helpful votes, photos,
 * and a form to add or update your own.
 */
const ReviewsSection = ({ itemType, itemId }) => {
  const { t: tx } = useLanguage();

  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("new");
  const [onlyPhotos, setOnlyPhotos] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const [viewing, setViewing] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await getReviews(itemType, itemId, sort);
      setReviews(res.data || []);
      setAverage(res.average || 0);
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setLoading(false);
    }
  }, [itemType, itemId, sort]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!viewing) return undefined;

    const onKey = (event) => event.key === "Escape" && setViewing("");

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);

  // Real numbers from the loaded reviews: how many gave each star, and the latest ten ratings
  const stats = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach((r) => {
      counts[r.rating] += 1;
    });

    const latest = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

    return { counts, latest };
  }, [reviews]);

  const shownReviews = onlyPhotos ? reviews.filter((r) => r.photos?.length > 0) : reviews;

  const myReview = reviews.find((r) => String(r.user) === String(user?._id || user?.id));

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment || "");
    }
  }, [myReview?._id, myReview?.rating, myReview?.comment]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!rating) {
      setMessage(tx("Please choose a star rating."));
      return;
    }

    setSubmitting(true);

    try {
      await saveReview(itemType, itemId, { rating, comment });
      setMessage(tx("Thanks! Your review has been saved. You can now add photos."));
      await load();
    } catch (error) {
      setMessage(error?.response?.data?.message || tx("Could not save your review."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId) => {
    try {
      await deleteReview(reviewId);
      setRating(0);
      setComment("");
      setMessage("");
      await load();
    } catch (error) {
      setMessage(error?.response?.data?.message || tx("Could not delete the review."));
    }
  };

  const handleHelpful = async (review) => {
    if (!isAuthenticated) return;

    // show the vote at once, then settle on the server's count
    setReviews((list) =>
      list.map((r) =>
        r._id === review._id ? { ...r, iVoted: !r.iVoted, helpfulCount: r.helpfulCount + (r.iVoted ? -1 : 1) } : r
      )
    );

    try {
      const res = await toggleReviewHelpful(review._id);
      setReviews((list) => list.map((r) => (r._id === review._id ? { ...r, ...res.data } : r)));
    } catch (error) {
      await load();
    }
  };

  const handlePhotos = async (event) => {
    const files = Array.from(event.target.files || []);

    event.target.value = "";
    setPhotoMessage("");

    if (!myReview || files.length === 0) return;

    if (myReview.photos.length + files.length > MAX_PHOTOS) {
      setPhotoMessage(`A review can have up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const bad = files.find((f) => !PHOTO_TYPES.includes(f.type) || f.size > MAX_PHOTO_MB * 1024 * 1024);

    if (bad) {
      setPhotoMessage(`Use JPEG, PNG or WebP photos under ${MAX_PHOTO_MB} MB.`);
      return;
    }

    try {
      setPhotoBusy(true);
      await uploadReviewPhotos(myReview._id, files);
      await load();
    } catch (error) {
      setPhotoMessage(error?.response?.data?.message || tx("Could not upload the photo."));
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async (index) => {
    try {
      setPhotoBusy(true);
      setPhotoMessage("");
      await deleteReviewPhoto(myReview._id, index);
      await load();
    } catch (error) {
      setPhotoMessage(error?.response?.data?.message || tx("Could not remove the photo."));
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <section className="place-details-section reviews-section">
      <div className="place-details-section-label">{t("reviews.label")}</div>

      <h2>
        {t("reviews.title")}
        {reviews.length > 0 && (
          <span className="reviews-summary">
            <Star size={16} fill="currentColor" /> {average} · {reviews.length}{" "}
            {reviews.length === 1 ? tx("review") : tx("reviews")}
          </span>
        )}
      </h2>

      {reviews.length > 0 && (
        <div className="rv-summary">
          <div className="rv-score-block">
            <span className="rv-score big">{Number(average).toFixed(1)}</span>
            <div>
              <strong>{overallLabel(average)}</strong>
              <small>{reviews.length} {reviews.length === 1 ? "Rating" : "Ratings"}</small>
            </div>
          </div>

          <ul className="rv-bars">
            {[5, 4, 3, 2, 1].map((star) => {
              const percent = Math.round((stats.counts[star] / reviews.length) * 100);

              return (
                <li key={star}>
                  <span>{RATING_LABELS[star]}</span>
                  <div className="rv-bar"><i style={{ width: `${percent}%` }} /></div>
                  <em>{percent}%</em>
                </li>
              );
            })}
          </ul>

          <div className="rv-latest">
            <h3>Last {stats.latest.length} customer ratings <small>(latest first)</small></h3>
            <div>
              {stats.latest.map((r) => (
                <span key={r._id} className={`rv-chip r${r.rating}`} title={RATING_LABELS[r.rating]}>{r.rating}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {isAuthenticated ? (
        <form className="review-form" onSubmit={handleSubmit}>
          <label>{t(myReview ? "reviews.update" : "reviews.rate")}</label>

          <StarRow value={rating} onChange={setRating} size={24} />

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={t("reviews.placeholder")}
          />

          <div className="review-form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? t("reviews.saving") : myReview ? t("reviews.updateBtn") : t("reviews.post")}
            </button>

            {message && <span className="review-message">{message}</span>}
          </div>

          {myReview && (
            <div className="review-photos-edit">
              <div className="review-photo-row">
                {myReview.photos.map((photo, index) => (
                  <div className="review-photo-thumb" key={photo.url}>
                    <img src={photo.url} alt={`Your photo ${index + 1}`} loading="lazy" />
                    <button type="button" onClick={() => removePhoto(index)} disabled={photoBusy} aria-label={`Remove photo ${index + 1}`}>
                      <X size={13} />
                    </button>
                  </div>
                ))}

                {myReview.photos.length < MAX_PHOTOS && (
                  <label className={`review-photo-add ${photoBusy ? "busy" : ""}`}>
                    <Camera size={18} />
                    <span>{photoBusy ? "..." : t("reviews.addPhotos")}</span>
                    <input type="file" accept={PHOTO_TYPES.join(",")} multiple onChange={handlePhotos} disabled={photoBusy} />
                  </label>
                )}
              </div>

              <small>{tx("Up to {n} photos, JPEG, PNG or WebP, {mb} MB each.", { n: MAX_PHOTOS, mb: MAX_PHOTO_MB })}</small>
              {photoMessage && <span className="review-message error">{photoMessage}</span>}
            </div>
          )}
        </form>
      ) : (
        <p className="review-login-hint"> <Link to="/login">{tx("Log in")}</Link> {tx("to rate and review this {type}.", { type: tx(itemType) })} </p>
      )}

      {reviews.length > 1 && (
        <div className="rv-filters">
          <div className="review-sort" role="group" aria-label={tx("Sort reviews")}>
            <button type="button" className={sort === "new" ? "active" : ""} onClick={() => setSort("new")}>{t("reviews.newest")}</button>
            <button type="button" className={sort === "helpful" ? "active" : ""} onClick={() => setSort("helpful")}>{t("reviews.helpful")}</button>
          </div>

          <div className="review-sort" role="group" aria-label="Filter reviews">
            <button type="button" className={!onlyPhotos ? "active" : ""} onClick={() => setOnlyPhotos(false)}>All reviews</button>
            <button type="button" className={onlyPhotos ? "active" : ""} onClick={() => setOnlyPhotos(true)}>Review with images</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="review-empty">{t("reviews.loading")}</p>
      ) : reviews.length === 0 ? (
        <p className="review-empty">{t("reviews.empty")}</p>
      ) : shownReviews.length === 0 ? (
        <p className="review-empty">No reviews with images yet.</p>
      ) : (
        <ul className="review-list">
          {shownReviews.map((review) => {
            const mine = myReview && review._id === myReview._id;

            return (
              <li key={review._id} className="review-item">
                <div className="review-item-head">
                  <span className={`rv-score r${review.rating}`}>{Number(review.rating).toFixed(1)}</span>
                  <div className="rv-who">
                    <strong>{RATING_LABELS[review.rating]}</strong>
                    <span>{review.userName}</span>
                  </div>
                  <time dateTime={review.createdAt}>
                    Reviewed {new Date(review.createdAt).toLocaleDateString(dateLocale(), {
                      month: "short",
                      year: "numeric",
                    })}
                  </time>

                  {(mine || user?.role === "admin") && (
                    <button
                      type="button"
                      className="review-delete"
                      onClick={() => handleDelete(review._id)}
                      aria-label={tx("Delete review")}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {review.comment && <p>{review.comment}</p>}

                {review.photos?.length > 0 && (
                  <div className="review-photo-row">
                    {review.photos.map((photo, index) => (
                      <button type="button" className="review-photo-thumb view" key={photo.url} onClick={() => setViewing(photo.url)} aria-label={`Open photo ${index + 1} by ${review.userName}`}>
                        <img src={photo.url} alt="" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}

                {!mine && (
                  <button
                    type="button"
                    className={`review-helpful ${review.iVoted ? "on" : ""}`}
                    onClick={() => handleHelpful(review)}
                    disabled={!isAuthenticated}
                    aria-pressed={review.iVoted}
                    title={isAuthenticated ? undefined : tx("Log in to vote")}
                  >
                    <ThumbsUp size={14} fill={review.iVoted ? "currentColor" : "none"} />
                    {t("reviews.helpfulBtn")}{review.helpfulCount > 0 ? ` (${review.helpfulCount})` : ""}
                  </button>
                )}

                {mine && review.helpfulCount > 0 && (
                  <span className="review-helpful-count"> <ThumbsUp size={14} /> {tx("{n} found this helpful", { n: review.helpfulCount })} </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {viewing && (
        <div className="review-lightbox" role="dialog" aria-modal="true" aria-label={tx("Review photo")} onClick={() => setViewing("")}>
          <button type="button" aria-label={tx("Close photo")} onClick={() => setViewing("")}><X size={22} /></button>
          <img src={viewing} alt={tx("Traveler photo")} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
};

export default ReviewsSection;
