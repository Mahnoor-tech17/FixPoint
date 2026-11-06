import React, { useState, useEffect } from "react";
import { Star, MessageSquare } from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import StarRating from "../../components/common/StarRating";
import Spinner from "../../components/common/Spinner";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import { getUser } from "../../lib/local-storage";
import { httpClient } from "../../lib/http";

export default function ProviderReviews() {
  const user = getUser();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState({ average: 5, total: 0 });

  useEffect(() => {
    if (!user?._id) return;
    setLoading(true);
    httpClient
      .get(`/public/providers/${user._id}/reviews?page=${page}&limit=10`)
      .then((res) => {
        if (res.data?.success) {
          setReviews(res.data.reviews || []);
          setPages(res.data.pages || 1);
          setStats({
            average: res.data.average || 5,
            total: res.data.total || 0,
          });
        }
      })
      .catch((err) => console.error("Error loading reviews:", err))
      .finally(() => setLoading(false));
  }, [user?._id, page]);

  return (
    <ProviderLayout title="Customer Reviews & Ratings">
      <div className="space-y-6 max-w-4xl">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">My Reviews</h2>
            <p className="text-xs text-gray-500">
              Customer feedback helps build your credibility on FixPoint.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100">
            <span className="text-3xl font-black text-ink">
              {Number(stats.average).toFixed(1)}
            </span>
            <div>
              <StarRating rating={stats.average} size="sm" />
              <span className="text-[10px] text-gray-400 block mt-0.5">
                {stats.total} total ratings
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No reviews yet"
            description="Reviews submitted by customers upon completing service appointments will appear here."
          />
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div
                key={r._id}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-ink">
                      {r.customerName || "Customer"}
                    </span>
                    <StarRating rating={r.rating} size="sm" showValue />
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {r.comment && (
                  <p className="text-xs text-gray-700 bg-gray-50 rounded-2xl p-3 leading-relaxed">
                    "{r.comment}"
                  </p>
                )}
              </div>
            ))}

            <Pagination page={page} pages={pages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
