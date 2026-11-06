import React, { useState, useEffect } from "react";
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

export default function CustomerReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

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

  useEffect(() => {
    fetchReviews();
  }, [page]);

  const handleOpenEdit = (rev) => {
    setEditingReview(rev);
    setEditRating(rev.rating);
    setEditComment(rev.comment || "");
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    try {
      const res = await httpClient.put(`/reviews/${editingReview._id}`, {
        rating: editRating,
        comment: editComment.trim(),
      });
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
              Manage the ratings and feedback you've submitted for completed services.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No reviews submitted"
            description="You haven't written any reviews yet. Complete a service appointment to leave feedback!"
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
