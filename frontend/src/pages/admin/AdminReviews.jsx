import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Star, MessageSquare, Trash2, User } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import StarRating from "../../components/common/StarRating";
import Spinner from "../../components/common/Spinner";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { httpClient, getErrorMessage } from "../../lib/http";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Delete state
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchReviews = () => {
    setLoading(true);
    httpClient
      .get(`/reviews?page=${page}&limit=10`)
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

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await httpClient.delete(`/reviews/${deletingId}`);
      if (res.data?.success) {
        toast.success("Review removed by administrator.");
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
    <AdminLayout title="Reviews Moderation">
      <div className="space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Platform Reviews</h2>
            <p className="text-xs text-gray-500">
              Audit and moderate customer reviews across all service providers.
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
            title="No reviews found"
            description="No customer reviews have been submitted yet."
          />
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div
                key={r._id}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <StarRating rating={r.rating} size="sm" showValue />
                    <span className="text-[10px] text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 flex flex-wrap items-center gap-4">
                    <span>
                      Customer:{" "}
                      <strong className="text-ink">
                        {r.customerId?.firstName} {r.customerId?.lastName}
                      </strong>
                    </span>
                    <span>
                      Provider:{" "}
                      <strong className="text-ink">
                        {r.providerId?.firstName} {r.providerId?.lastName}
                      </strong>{" "}
                      ({r.providerId?.serviceCategory?.replace("-", " ")})
                    </span>
                    {r.bookingId && (
                      <span>
                        Service:{" "}
                        <strong className="text-ink">
                          {r.bookingId?.serviceTitle}
                        </strong>
                      </span>
                    )}
                  </div>

                  {r.comment && (
                    <p className="text-xs text-gray-700 bg-gray-50 rounded-2xl p-3 leading-relaxed max-w-2xl">
                      "{r.comment}"
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setDeletingId(r._id)}
                    className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                    title="Remove Review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <Pagination page={page} pages={pages} onPageChange={setPage} />
          </div>
        )}

        <ConfirmDialog
          isOpen={Boolean(deletingId)}
          onClose={() => setDeletingId(null)}
          onConfirm={handleDelete}
          title="Delete Review"
          message="Are you sure you want to administratively delete this review? The provider's average rating will be recalculated."
          confirmText={deleteLoading ? "Deleting..." : "Delete Review"}
          variant="danger"
        />
      </div>
    </AdminLayout>
  );
}
