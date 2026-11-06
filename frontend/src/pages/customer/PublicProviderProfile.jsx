import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import Spinner from "../../components/common/Spinner";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import StarRating from "../../components/common/StarRating";
import { httpClient } from "../../lib/http";

export default function PublicProviderProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [workingSchedule, setWorkingSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ total: 0, average: 5 });
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPages, setReviewPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    httpClient
      .get(`/public/providers/${id}`)
      .then((res) => {
        if (res.data?.success) {
          setProvider(res.data.provider);
          setServices(res.data.services || []);
          setWorkingSchedule(res.data.workingSchedule || null);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load provider profile");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setReviewsLoading(true);
    httpClient
      .get(`/public/providers/${id}/reviews?page=${reviewPage}&limit=5`)
      .then((res) => {
        if (res.data?.success) {
          setReviews(res.data.reviews || []);
          setReviewStats({
            total: res.data.total || 0,
            average: res.data.average || 5,
          });
          setReviewPages(res.data.pages || 1);
        }
      })
      .catch((err) => console.error("Error fetching reviews:", err))
      .finally(() => setReviewsLoading(false));
  }, [id, reviewPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-soft flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen bg-soft flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
          <EmptyState
            title="Provider Not Found"
            description={error || "The requested service provider is currently unavailable."}
            action={
              <Link to="/search" className="btn-dark text-xs px-5 py-2.5">
                Browse Other Providers
              </Link>
            }
          />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Card Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar */}
            <div className="shrink-0">
              {provider.profilePhoto ? (
                <img
                  src={provider.profilePhoto}
                  alt={`${provider.firstName} ${provider.lastName}`}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-pastel-mint flex items-center justify-center text-ink text-3xl font-black shadow-inner">
                  {provider.firstName?.[0]}
                  {provider.lastName?.[0]}
                </div>
              )}
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
                  {provider.firstName} {provider.lastName}
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-pastel-yellow text-ink uppercase tracking-wider">
                  {provider.serviceCategory?.replace("-", " ") || "Home Service"}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Provider
                </span>
              </div>

              {/* Meta stats */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-4">
                <StarRating
                  rating={provider.rating?.average || 5}
                  reviewCount={provider.rating?.count || 0}
                  showValue
                  size="md"
                />

                {provider.serviceArea && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {provider.serviceArea}
                  </span>
                )}

                {provider.experienceYears && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {provider.experienceYears} Years in Service
                  </span>
                )}
              </div>

              {/* Bio */}
              {provider.bio ? (
                <p className="text-sm text-gray-600 leading-relaxed max-w-3xl mb-6">
                  {provider.bio}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic mb-6">
                  Professional service provider verified by FixPoint.
                </p>
              )}

              {/* Working Schedule Summary */}
              {workingSchedule && (
                <div className="bg-gray-50 rounded-2xl p-4 inline-flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs text-gray-600 border border-gray-100">
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Working Hours:</span>
                  </div>
                  <div>
                    {workingSchedule.workingDays?.join(", ") || "Mon - Sat"} (
                    {workingSchedule.startTime || "09:00"} - {workingSchedule.endTime || "18:00"})
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Services & Reviews Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Services Catalog (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-ink">Offered Services</h2>
                <p className="text-xs text-gray-500">
                  Select a service below to book an appointment with {provider.firstName}.
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-white rounded-full border border-gray-200">
                {services.length} {services.length === 1 ? "service" : "services"}
              </span>
            </div>

            {services.length === 0 ? (
              <EmptyState
                title="No Services Listed"
                description="This provider has not added any active services yet."
              />
            ) : (
              <div className="space-y-4">
                {services.map((srv) => (
                  <div
                    key={srv._id}
                    className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gray-300 transition"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-ink">{srv.title}</h3>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">
                          {srv.serviceType || "service"}
                        </span>
                      </div>

                      {srv.description && (
                        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                          {srv.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {srv.durationMinutes} mins
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="font-semibold text-emerald-600">
                          {srv.priceType === "hourly" ? "Hourly rate" : "Fixed price"}
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100 gap-2 shrink-0">
                      <div className="text-left sm:text-right">
                        <span className="text-lg font-black text-ink">
                          PKR {srv.price}
                        </span>
                      </div>

                      <Link
                        to={`/book?providerId=${provider._id}&serviceId=${srv._id}`}
                        className="btn-dark text-xs px-5 py-2.5 flex items-center gap-1.5"
                      >
                        Book Now
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Reviews Section (1 col) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-ink">Customer Reviews</h2>
                <p className="text-xs text-gray-500">
                  {reviewStats.total} verified reviews
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              {/* Rating summary */}
              <div className="flex items-center gap-4 pb-6 border-b border-gray-100 mb-6">
                <div className="text-4xl font-black text-ink">
                  {Number(provider.rating?.average || 5).toFixed(1)}
                </div>
                <div>
                  <StarRating rating={provider.rating?.average || 5} size="sm" />
                  <p className="text-xs text-gray-400 mt-1">
                    Based on {provider.rating?.count || 0} completed bookings
                  </p>
                </div>
              </div>

              {/* Reviews List */}
              {reviewsLoading ? (
                <div className="py-8">
                  <Spinner size="md" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">
                    No reviews yet. Be the first to book and rate!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev._id}
                      className="pb-4 border-b border-gray-100 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-ink">
                          {rev.customerName || "Customer"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <StarRating rating={rev.rating} size="sm" className="mb-2" />

                      {rev.comment && (
                        <p className="text-xs text-gray-600 leading-relaxed">
                          "{rev.comment}"
                        </p>
                      )}
                    </div>
                  ))}

                  <Pagination
                    page={reviewPage}
                    pages={reviewPages}
                    onPageChange={setReviewPage}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
