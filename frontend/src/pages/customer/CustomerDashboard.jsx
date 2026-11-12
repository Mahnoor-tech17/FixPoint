import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  MapPin,
  Star,
  DollarSign,
  User,
  ShieldCheck,
  Users,
} from "lucide-react";
import CustomerLayout from "../../components/customer/CustomerLayout";
import StatusBadge from "../../components/common/StatusBadge";
import StarRating from "../../components/common/StarRating";
import { getUser } from "../../lib/local-storage";
import { httpClient } from "../../lib/http";

export default function CustomerDashboard() {
  const user = getUser();
  const [loading, setLoading] = useState(true);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [featuredProviders, setFeaturedProviders] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      httpClient.get("/customer/bookings?scope=upcoming&limit=3"),
      httpClient.get("/public/featured"),
    ])
      .then(([bookingsRes, providersRes]) => {
        if (bookingsRes.status === "fulfilled" && bookingsRes.value.data?.success) {
          setUpcomingBookings(bookingsRes.value.data.bookings || []);
        }
        if (providersRes.status === "fulfilled" && providersRes.value.data?.success) {
          setFeaturedProviders(providersRes.value.data.providers || []);
        }
      })
      .catch((err) => console.error("Error loading dashboard data:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CustomerLayout title="Customer Dashboard">
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-3xl bg-pastel-yellow p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-amber-200">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
              Welcome back, {user?.firstName}!
            </h2>
            <p className="mt-2 max-w-lg text-sm text-slate-700 leading-relaxed">
              Find verified home service specialists in your area, reserve available appointment slots, and manage your bookings effortlessly.
            </p>
          </div>
          <Link
            to="/customer/search"
            className="btn-dark px-6 py-3.5 text-xs font-bold shrink-0 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Book a Service
          </Link>
        </div>

        {/* Quick stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            to="/customer/bookings"
            className="rounded-3xl bg-white p-5 border border-black/5 shadow-xs hover:shadow-md transition flex items-center gap-4"
          >
            <div className="h-12 w-12 rounded-2xl bg-pastel-mint flex items-center justify-center">
              <Calendar className="h-5 w-5 text-ink" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink leading-none">
                {loading ? "–" : upcomingBookings.length}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Upcoming bookings</p>
            </div>
          </Link>

          <Link
            to="/customer/search"
            className="rounded-3xl bg-white p-5 border border-black/5 shadow-xs hover:shadow-md transition flex items-center gap-4"
          >
            <div className="h-12 w-12 rounded-2xl bg-pastel-yellow flex items-center justify-center">
              <Users className="h-5 w-5 text-ink" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink leading-none">
                {loading ? "–" : featuredProviders.length}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Top verified providers</p>
            </div>
          </Link>

          <Link
            to="/customer/reviews"
            className="rounded-3xl bg-white p-5 border border-black/5 shadow-xs hover:shadow-md transition flex items-center gap-4"
          >
            <div className="h-12 w-12 rounded-2xl bg-pastel-yellow flex items-center justify-center">
              <Star className="h-5 w-5 text-ink" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-ink leading-tight">Rate FixPoint</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Share your feedback</p>
            </div>
          </Link>
        </div>

        {/* Section: Upcoming Bookings */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-ink sm:text-xl">Upcoming Bookings</h3>
              <p className="text-xs text-slate-500">Your scheduled home service appointments</p>
            </div>
            {upcomingBookings.length > 0 && (
              <Link
                to="/customer/bookings"
                className="text-xs font-bold text-ink hover:underline flex items-center gap-1"
              >
                View all bookings <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 w-full animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center border border-black/5 shadow-xs">
              <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-ink">No upcoming bookings</p>
              <p className="text-xs text-slate-500 mt-1">
                You do not have any active appointments. Book a verified professional today.
              </p>
              <div className="mt-4">
                <Link to="/customer/search" className="btn-dark text-xs py-2 px-4">
                  Find Providers
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingBookings.map((b) => (
                <div
                  key={b._id}
                  className="rounded-3xl bg-white p-5 border border-black/5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {b.category}
                      </span>
                      <StatusBadge status={b.status} />
                    </div>

                    <div className="flex items-center gap-3">
                      {b.provider?.profilePhoto ? (
                        <img
                          src={b.provider.profilePhoto}
                          alt={b.provider.firstName}
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pastel-mint text-sm font-bold text-ink">
                          {b.provider?.firstName?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-ink">
                          {b.provider?.firstName} {b.provider?.lastName}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          #{b.bookingId || b._id?.slice(-6).toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-slate-700 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{b.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{b.slotStart} – {b.slotEnd}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                      {b.estimatedPrice
                        ? `Est. Rs ${b.estimatedPrice.toLocaleString()}`
                        : "Service fee after work"}
                    </span>
                    <Link
                      to="/customer/bookings"
                      className="text-xs font-bold text-ink hover:underline flex items-center gap-1"
                    >
                      Details <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section: Featured Top Providers */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-ink sm:text-xl">Top Rated Providers</h3>
              <p className="text-xs text-slate-500">Booking is done from Browse Services</p>
            </div>
            <Link
              to="/customer/search"
              className="text-xs font-bold text-ink hover:underline flex items-center gap-1"
            >
              Browse all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-80 w-full animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          ) : featuredProviders.length === 0 ? null : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {featuredProviders.slice(0, 3).map((p) => (
                <div
                  key={p._id}
                  className="rounded-3xl bg-white p-6 border border-black/5 shadow-xs hover:shadow-md transition flex flex-col items-center text-center min-h-[20rem]"
                >
                  <div className="shrink-0 mb-4">
                    {p.profilePhoto ? (
                      <img
                        src={p.profilePhoto}
                        alt={p.firstName}
                        className="h-24 w-24 rounded-2xl object-cover border border-slate-100"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-pastel-mint text-xl font-extrabold text-ink">
                        {p.firstName?.[0]}
                        {p.lastName?.[0]}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 w-full flex flex-col items-center">
                    <div className="flex items-center gap-1.5 max-w-full">
                      <p className="text-lg font-bold text-ink truncate">
                        {p.firstName} {p.lastName}
                      </p>
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    </div>
                    <span className="mt-1 rounded-full bg-pastel-yellow px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
                      {p.serviceCategory?.replace("-", " ")}
                    </span>

                    <div className="mt-3 flex flex-col items-center gap-1.5 text-xs text-slate-500">
                      <StarRating rating={p.rating?.average || 5} showValue size="sm" />
                      {(p.city || p.serviceArea) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" /> {p.city || p.serviceArea}
                        </span>
                      )}
                      {p.experienceYears > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" /> {p.experienceYears} yrs experience
                        </span>
                      )}
                    </div>

                    {p.bio && (
                      <p className="mt-3 text-xs text-slate-600 line-clamp-2 break-words max-w-full leading-relaxed">
                        {p.bio}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 w-full space-y-2">
                    <p className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1">
                      Booking fee Rs 200 · Service fee after work
                    </p>
                    <Link
                      to={p.serviceCategory ? `/customer/search?category=${encodeURIComponent(p.serviceCategory)}` : "/customer/search"}
                      className="btn-dark text-xs py-2.5 px-4 w-full flex items-center justify-center gap-1"
                    >
                      Find in Browse Services <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </CustomerLayout>
  );
}