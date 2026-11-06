import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";
import CustomerLayout from "../../components/customer/CustomerLayout";

export default function CustomerPaymentCancelled() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  return (
    <CustomerLayout title="Booking Payment Cancelled">
      <div className="mx-auto max-w-xl py-12">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xs border border-black/5 sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-ink">Payment Cancelled</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Your booking fee checkout was cancelled. No charges were made.
            If your hold window has not expired, you can still complete payment from your bookings page.
          </p>
          <div className="pt-6 flex justify-center gap-3">
            <Link to="/customer/bookings" className="btn-dark flex items-center gap-2">
              View Bookings <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/customer/search" className="rounded-full px-5 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100">
              Browse Providers
            </Link>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
