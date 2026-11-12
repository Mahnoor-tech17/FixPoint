import React, { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Star, MessageSquare, Edit3, Trash2 } from "lucide-react";
import CustomerLayout from "../../components/customer/CustomerLayout";
import StarRating from "../../components/common/StarRating";
import Spinner from "../../components/common/Spinner";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { httpClient, getErrorMessage } from "../../lib/http";

const reviewSchema = z.object({
  rating: z
    .number()
    .int("Please select a rating")
    .min(1, "Please select a rating from 1 to 5 stars")
    .max(5, "Rating cannot be more than 5 stars"),
  comment: z
    .string()
    .trim()
    .max(1000, "Comment must be 1000 characters or less")
    .refine(
      (v) => v.length === 0 || v.length >= 5,
      "Comment must be at least 5 characters (or leave it empty)",
    ),
});

// Returns cleaned data, or shows a toast and returns null
const validateReview = (rating, comment) => {
  const result = reviewSchema.safeParse({ rating: Number(rating), comment });
  if (!result.success) {
    toast.error(result.error.issues[0].message);
    return null;
  }
  return result.data;
};

export default function CustomerReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Tabs: "app" (default, pehle) | "provider"
  const [tab, setTab] = useState("app");

  // App (FixPoint) review state
  const [appReview, setAppReview] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [appRating, setAppRating] = useState(5);
  const [appComment, setAppComment] = useState("");
  const [appSaving, setAppSaving] = useState(false);
  const [appEditing, setAppEditing] = useState(false);
  const [appDeleteOpen, setAppDeleteOpen] = useState(false);

  // Reviews pending for completed bookings
  const [pendingBookings, setPendingBookings] = useState([]);
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [newLoading, setNewLoading] = useState(false);

  // Edit review state
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete review state
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchReviews = () => {
    setLoading(true);
    httpClient
      .get(`/reviews/my?page=${page}&limit=10`)
      .then((res) => {
        if (res.data?.success) {
          setReviews(res.data.reviews || []);
          setPages(res.data.pages || 1);
        }
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, "Failed to load reviews"));
      })
      .finally(() => setLoading(false));
  };

  const fetchPending = async () => {
    try {
      const [bRes, rRes] = await Promise.all([
        httpClient.get("/customer/bookings?status=completed&limit=50"),
        httpClient.get("/reviews/my?page=1&limit=50"),
      ]);
      const reviewedIds = new Set(
        (rRes.data?.reviews || []).map((r) => String(r.bookingId?._id || r.bookingId))
      );
      const list = (bRes.data?.bookings || []).filter(
        (b) => !b.reviewed && !reviewedIds.has(String(b._id))
      );
      setPendingBookings(list);
    } catch (err) {
      console.error("Fetch pending reviews error:", err);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [page]);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchAppReview = () => {
    setAppLoading(true);
    httpClient
      .get("/app-reviews/my")
      .then((res) => {
        const r = res.data?.review || null;
        setAppReview(r);
        setAppRating(r?.rating || 5);
        setAppComment(r?.comment || "");
        setAppEditing(!r);
      })
      .catch((err) => toast.error(getErrorMessage(err, "Failed to load app review")))
      .finally(() => setAppLoading(false));
  };

  useEffect(() => {
    fetchAppReview();
  }, []);

  const handleSaveAppReview = async () => {
    const data = validateReview(appRating, appComment);
    if (!data) return;

    setAppSaving(true);
    try {
      const res = await httpClient.post("/app-reviews/my", data);
      if (res.data?.success) {
        toast.success(res.data.message || "Thanks for reviewing FixPoint!");
        fetchAppReview();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save app review"));
    } finally {
      setAppSaving(false);
    }
  };

  const handleDeleteAppReview = async () => {
    try {
      const res = await httpClient.delete("/app-reviews/my");
      if (res.data?.success) {
        toast.success("Your app review was removed.");
        setAppDeleteOpen(false);
        fetchAppReview();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete app review"));
    }
  };

  const handleOpenNew = (b) => {
    setReviewingBooking(b);
    setNewRating(5);
    setNewComment("");
  };

  const handleSubmitNew = async () => {
    const data = validateReview(newRating, newComment);
    if (!data) return;

    setNewLoading(true);
    try {
      const res = await httpClient.post("/reviews", {
        bookingId: reviewingBooking._id,
        ...data,
      });
      if (res.data?.success) {
        toast.success("Review submitted! Thank you.");
        setReviewingBooking(null);
        fetchReviews();
        fetchPending();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to submit review"));
    } finally {
      setNewLoading(false);
    }
  };

  const handleOpenEdit = (rev) => {
    setEditingReview(rev);
    setEditRating(rev.rating);
    setEditComment(rev.comment || "");
  };

  const handleSaveEdit = async () => {
    const data = validateReview(editRating, editComment);
    if (!data) return;

    setEditLoading(true);
    try {
      const res = await httpClient.put(`/reviews/${editingReview._id}`, data);
      if (res.data?.success) {
        toast.success("Review updated successfully!");
        setEditingReview(null);
        fetchReviews();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update review"));
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await httpClient.delete(`/reviews/${deletingId}`);
      if (res.data?.success) {
        toast.success("Review deleted.");
        setDeletingId(null);
        fetchReviews();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete review"));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <CustomerLayout title="My Reviews">
      <div className="space-y-6 max-w-4xl">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Reviews & Feedback</h2>
            <p className="text-xs text-gray-500">
              Rate your service providers after completed bookings, and share feedback about the FixPoint app.
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="inline-flex rounded-full bg-white border border-gray-100 p-1 shadow-sm">
          {[
            { key: "app", label: "FixPoint App Review" },
            { key: "provider", label: "Provider Reviews" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition ${
                tab === t.key ? "bg-ink text-white" : "text-gray-500 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "app" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-ink">How is FixPoint working for you?</h3>
              <p className="text-xs text-gray-500">
                Share your feedback about the FixPoint app itself. This is separate from provider
                reviews and does not need a booking.
              </p>
            </div>

            {appLoading ? (
              <div className="py-10 flex justify-center">
                <Spinner size="lg" />
              </div>
            ) : appReview && !appEditing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <StarRating rating={appReview.rating} size="md" showValue />
                  <span className="text-[10px] text-gray-400">
                    {new Date(appReview.updatedAt || appReview.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {appReview.comment && (
                  <p className="text-xs text-gray-700 bg-gray-50 rounded-2xl p-3 max-w-2xl">
                    "{appReview.comment}"
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAppEditing(true)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppDeleteOpen(true)}
                    className="px-4 py-2 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-xl">
                <StarRating rating={appRating} interactive onChange={setAppRating} size="lg" />
                <textarea
                  rows={4}
                  maxLength={1000}
                  placeholder="What do you like? What can we improve?"
                  value={appComment}
                  onChange={(e) => setAppComment(e.target.value)}
                  className="w-full text-xs rounded-xl border border-gray-200 p-3"
                />
                <div className="flex gap-2">
                  {appReview && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppEditing(false);
                        setAppRating(appReview.rating);
                        setAppComment(appReview.comment || "");
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveAppReview}
                    disabled={appSaving}
                    className="btn-dark text-xs px-5 py-2 font-bold"
                  >
                    {appSaving ? "Saving..." : appReview ? "Save Changes" : "Submit Review"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "provider" && (
          <>
        {pendingBookings.length > 0 && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-ink">Waiting for your review</h3>
            {pendingBookings.map((b) => (
              <div
                key={b._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-ink">
                    {b.provider?.firstName || b.providerId?.firstName}{" "}
                    {b.provider?.lastName || b.providerId?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    #{b.bookingId} · {b.date} · {b.slotStart} – {b.slotEnd}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenNew(b)}
                  className="btn-dark text-xs px-4 py-2 flex items-center justify-center gap-1.5"
                >
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  Rate & Review
                </button>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No reviews submitted"
            description="You haven't written any reviews yet. Once the provider marks your appointment as completed, it will appear above for review."
          />
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div
                key={r._id}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <StarRating rating={r.rating} size="sm" showValue />
                    <span className="text-[10px] text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-ink">
                    {r.bookingId?.serviceTitle || "Service"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Provider:{" "}
                    <span className="font-semibold text-ink">
                      {r.providerId?.firstName} {r.providerId?.lastName}
                    </span>
                  </p>

                  {r.comment && (
                    <p className="text-xs text-gray-700 bg-gray-50 rounded-2xl p-3 max-w-2xl">
                      "{r.comment}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(r)}
                    className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                    title="Edit Review"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(r._id)}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                    title="Delete Review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <Pagination page={page} pages={pages} onPageChange={setPage} />
          </div>
        )}

          </>
        )}

        {/* NEW REVIEW MODAL */}
        <Modal
          isOpen={Boolean(reviewingBooking)}
          onClose={() => setReviewingBooking(null)}
          title="Rate & Review"
        >
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <StarRating rating={newRating} interactive onChange={setNewRating} size="lg" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Your Feedback
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                placeholder="Write your review..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-200 p-3"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setReviewingBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitNew}
                disabled={newLoading}
                className="btn-dark text-xs px-5 py-2 font-bold"
              >
                {newLoading ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </Modal>

        {/* EDIT MODAL */}
        <Modal
          isOpen={Boolean(editingReview)}
          onClose={() => setEditingReview(null)}
          title="Edit Review"
        >
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <StarRating
                rating={editRating}
                interactive
                onChange={setEditRating}
                size="lg"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Your Feedback
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-200 p-3"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="btn-dark text-xs px-5 py-2 font-bold"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={appDeleteOpen}
          onClose={() => setAppDeleteOpen(false)}
          onConfirm={handleDeleteAppReview}
          title="Delete App Review"
          message="Are you sure you want to delete your review of FixPoint?"
          confirmText="Delete Review"
          variant="danger"
        />

        {/* DELETE CONFIRM */}
        <ConfirmDialog
          isOpen={Boolean(deletingId)}
          onClose={() => setDeletingId(null)}
          onConfirm={handleDelete}
          title="Delete Review"
          message="Are you sure you want to delete this review? Your rating will be removed from the provider's overall score."
          confirmText={deleteLoading ? "Deleting..." : "Delete Review"}
          variant="danger"
        />
      </div>
    </CustomerLayout>
  );
}
