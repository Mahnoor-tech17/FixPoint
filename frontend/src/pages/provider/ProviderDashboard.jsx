import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  ShieldCheck,
  Star,
} from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import { getErrorMessage, httpClient } from "../../lib/http";
import { getUser } from "../../lib/local-storage";

export default function ProviderDashboard() {
  const user = getUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingFee, setPayingFee] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await httpClient.get("/provider/dashboard");
      setData(res.data.dashboard);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handlePayRegistrationFee = async () => {
    try {
      setPayingFee(true);
      const res = await httpClient.post("/provider/registration-fee/checkout");
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.error("Could not initiate checkout session.");
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPayingFee(false);
    }
  };

  const providerStatus = data?.providerStatus || "invited";
  const isApproved = providerStatus === "approved";
  const registrationFeePaid = Boolean(data?.registrationFeePaid);
  const weeklySlotsCount = data?.weeklySlotsCount || 0;
  const needsSetup = isApproved && weeklySlotsCount === 0;

  return (
    <ProviderLayout title="Provider Dashboard">
      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl bg-white p-8 shadow-xs border border-black/5">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status-specific Welcome / Action Banner */}
          {providerStatus === "invited" && (
            <div className="rounded-3xl bg-pastel-yellow p-8 border border-amber-200">
              <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink mb-2">
                Action Required
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                Welcome, {user?.firstName}! Complete your profile
              </h2>
              <p className="mt-2 text-sm text-slate-700 max-w-xl leading-relaxed">
                You have been invited to join FixPoint. Please upload your profile photo, CNIC document, set your hourly rate, and specify your service areas to get verified by our team.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/provider/profile" className="btn-dark">
                  Complete profile <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {providerStatus === "pending_verification" && (
            <div className="rounded-3xl bg-pastel-blue p-8 border border-blue-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-900 mb-2">
                    Under Review
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                    Profile submitted for verification
                  </h2>
                  <p className="mt-2 text-sm text-blue-950 max-w-xl leading-relaxed">
                    Our team is reviewing your documents and experience. You will receive an email as soon as your account is approved.
                  </p>
                </div>
                <Link
                  to="/provider/verification"
                  className="btn-dark self-start sm:self-auto shrink-0"
                >
                  View status <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {providerStatus === "rejected" && (
            <div className="rounded-3xl bg-pastel-pink p-8 border border-rose-200">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <span className="inline-block rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-900 mb-2">
                    Changes Required
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                    Profile needs update
                  </h2>
                  {data?.rejectionReason && (
                    <div className="mt-3 rounded-2xl bg-white/80 p-3.5 border border-rose-200 max-w-lg">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                        Admin Note
                      </p>
                      <p className="text-sm font-semibold text-rose-950">
                        {data.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
                <Link
                  to="/provider/profile"
                  className="btn-dark self-start sm:self-auto shrink-0"
                >
                  Edit & Resubmit <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Approved: Unpaid Registration Fee */}
          {isApproved && !registrationFeePaid && (
            <div className="rounded-3xl bg-pastel-yellow p-8 border-2 border-amber-300 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-900">
                    <CreditCard className="h-3.5 w-3.5" /> Registration Fee Required
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                    Your profile is approved!
                  </h2>
                  <p className="text-sm text-slate-700 max-w-2xl leading-relaxed">
                    Pay the one-time Rs 500 registration fee to activate your account, become visible to customers in search results, and start receiving bookings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePayRegistrationFee}
                  disabled={payingFee}
                  className="btn-primary self-start md:self-center shrink-0 px-6 py-3.5 text-base font-bold flex items-center gap-2"
                >
                  {payingFee ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Connecting to Stripe...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" /> Pay Rs 500 Registration Fee
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Approved & Paid */}
          {isApproved && registrationFeePaid && (
            <div className="rounded-3xl bg-pastel-mint p-8 border border-emerald-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2">
                    <ShieldCheck className="h-3.5 w-3.5" /> Active and visible to customers
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                    Welcome back, {user?.firstName}!
                  </h2>
                  <p className="mt-1 text-sm text-emerald-950 max-w-xl">
                    Your profile is visible on FixPoint. Keep your weekly availability updated so customers can book appointment slots with you.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Link
                    to="/provider/availability"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs sm:text-sm font-semibold text-ink shadow-xs hover:bg-ink hover:text-white transition"
                  >
                    <Calendar className="h-4 w-4" /> Set availability
                  </Link>
                  <Link
                    to="/provider/bookings"
                    className="btn-dark text-xs sm:text-sm flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" /> View bookings
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Setup reminder banner if hourly rate or availability missing */}
          {needsSetup && (
            <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Action needed to receive bookings:</p>
                <p className="mt-0.5 text-amber-800">
                  Set your hourly rate and weekly availability to start receiving bookings.
                </p>
                <div className="mt-2 flex gap-3 font-semibold text-xs underline">
                  {weeklySlotsCount === 0 && <Link to="/provider/availability">Set Weekly Availability</Link>}
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Weekly Slots */}
            <div className="flex min-h-36 flex-col justify-between rounded-3xl p-6 bg-pastel-blue border border-black/5">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-950 shadow-xs">
                  <Calendar className="h-5 w-5" />
                </span>
                <Link
                  to="/provider/availability"
                  className="text-xs font-bold text-blue-950 hover:underline flex items-center gap-1"
                >
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div>
                <p className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                  {weeklySlotsCount}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">Weekly active slots</p>
              </div>
            </div>

            {/* Upcoming Bookings */}
            <div className="flex min-h-36 flex-col justify-between rounded-3xl p-6 bg-pastel-lime border border-black/5">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-lime-950 shadow-xs">
                  <Clock className="h-5 w-5" />
                </span>
                <Link
                  to="/provider/bookings"
                  className="text-xs font-bold text-lime-950 hover:underline flex items-center gap-1"
                >
                  View <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div>
                <p className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                  {data?.upcomingBookingsCount ?? 0}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">Upcoming bookings</p>
              </div>
            </div>

            {/* Rating */}
            <div className="flex min-h-36 flex-col justify-between rounded-3xl p-6 bg-pastel-yellow border border-black/5">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-950 shadow-xs">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </span>
              </div>
              <div>
                <p className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                  {data?.rating?.average ? Number(data.rating.average).toFixed(1) : "5.0"}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  Rating ({data?.rating?.count ?? 0} reviews)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProviderLayout>
  );
}
