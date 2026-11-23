import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CreditCard, Clock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import CustomerLayout from "../../components/customer/CustomerLayout";
import { httpClient, getErrorMessage } from "../../lib/http";

export default function CustomerPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [verifying, setVerifying] = useState(Boolean(sessionId));
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(sessionId ? "" : "No session ID found in the URL.");

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    httpClient
      .get(`/customer/bookings/verify-payment?session_id=${sessionId}`)
      .then((res) => {
        if (res.data?.success) {
          setBooking(res.data.booking);
        } else {
          setError(res.data?.message || "Could not verify payment.");
        }
      })
      .catch((err) => {
        setError(getErrorMessage(err, "Payment verification failed."));
      })
      .finally(() => setVerifying(false));
  }, [sessionId]);

  if (verifying) {
    return (
      <CustomerLayout title="Verifying Payment">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-ink" />
          <p className="text-sm text-slate-500">Verifying your payment, please wait…</p>
        </div>
      </CustomerLayout>
    );
  }

  if (error) {
    return (
      <CustomerLayout title="Verification Failed">
        <div className="max-w-md mx-auto text-center py-16 space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-extrabold text-ink">Something went wrong</h2>
          <p className="text-sm text-slate-500">{error}</p>
          <Link to="/customer/bookings" className="btn-dark inline-flex items-center gap-2 mt-4">
            View My Bookings <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  const total = booking?.total;
  const serviceNames = (booking?.items || []).map((i) => i.title).join(", ");

  return (
    <CustomerLayout title="Card Hold Placed">
      <div className="max-w-lg mx-auto py-8 space-y-6">
        {/* Success Header */}
        <div className="rounded-3xl bg-pastel-mint border border-emerald-200 p-8 text-center space-y-3">
          <div className="flex justify-center">
            <div className="rounded-full bg-emerald-100 p-4">
              <CreditCard className="h-8 w-8 text-emerald-700" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-ink">Card Hold Placed!</h1>
          <p className="text-sm text-emerald-800 font-medium">
            Rs {total?.toLocaleString() ?? "—"} is held on your card — not charged yet.
          </p>
        </div>

        {/* What Happens Next */}
        <div className="rounded-3xl bg-blue-50 border border-blue-200 p-6 space-y-4">
          <h2 className="text-sm font-extrabold text-ink flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            What happens next?
          </h2>
          <ol className="space-y-3">
            {[
              { step: "1", text: "The provider reviews your request and must accept or reject within 2 hours." },
              {
                step: "2",
                text: `If accepted, your card is charged Rs ${total?.toLocaleString() ?? "—"} and you'll get a confirmation email with the provider's contact details.`,
              },
              {
                step: "3",
                text: "If rejected or no response in 2 hours, your card hold is released automatically — you are not charged.",
              },
            ].map((item) => (
              <li key={item.step} className="flex items-start gap-3">
                <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-[10px] font-extrabold text-blue-900">
                  {item.step}
                </span>
                <span className="text-xs text-blue-900 leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Booking Summary */}
        {booking && (
          <div className="rounded-3xl bg-white border border-black/5 p-6 shadow-xs space-y-3">
            <h2 className="text-sm font-extrabold text-ink">Booking Summary</h2>
            <div className="text-xs text-slate-500 space-y-1.5">
              <p>
                <span className="font-semibold text-slate-700">ID:</span>{" "}
                #{booking.bookingId || booking._id?.slice(-6).toUpperCase()}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Services:</span> {serviceNames || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Date:</span> {booking.date} at {booking.slotStart}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Amount held:</span> Rs {total?.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/customer/bookings"
            className="btn-dark flex-1 text-center flex items-center justify-center gap-2"
          >
            View My Bookings <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/customer/search"
            className="flex-1 text-center rounded-full border border-black/10 px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </CustomerLayout>
  );
}
