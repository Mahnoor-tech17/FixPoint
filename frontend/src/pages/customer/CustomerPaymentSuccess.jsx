import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Loader2,
  Printer,
  ReceiptText,
} from "lucide-react";
import CustomerLayout from "../../components/customer/CustomerLayout";
import { httpClient } from "../../lib/http";
import { getUser } from "../../lib/local-storage";

function ReceiptView({ payment, booking, user }) {
  if (!payment && !booking) return null;
  const receiptNo = payment?._id
    ? `RCP-${payment._id.slice(-8).toUpperCase()}`
    : booking?._id
    ? `RCP-BK-${booking._id.slice(-6).toUpperCase()}`
    : "RCP-ONLINE";
  const paidAt = payment?.paidAt
    ? new Date(payment.paidAt)
    : payment?.createdAt
    ? new Date(payment.createdAt)
    : new Date();

  return (
    <div className="rounded-2xl bg-soft/60 border border-black/5 p-5 text-sm space-y-2.5 text-left mt-4 print-receipt">
      <div className="flex justify-between items-center border-b border-black/5 pb-2 mb-2">
        <span className="font-extrabold text-ink">Official Receipt</span>
        <span className="text-xs text-slate-400 font-mono">{receiptNo}</span>
      </div>
      {[
        ["Payer", `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Customer"],
        ["Role", "Customer"],
        ["Payment Type", "Booking Fee"],
        ["Amount Paid Online", `Rs ${payment?.amount || 100} PKR`],
        ["Payment Status", "PAID (Confirmed)"],
        ["Date & Time", paidAt.toLocaleString("en-PK")],
        ...(booking?.provider
          ? [
              [
                "Provider",
                `${booking.provider.firstName || ""} ${booking.provider.lastName || ""}`.trim(),
              ],
            ]
          : []),
        ...(booking?.date ? [["Appointment Date", booking.date]] : []),
        ...(booking?.slotStart && booking?.slotEnd
          ? [["Time Slot", `${booking.slotStart} - ${booking.slotEnd}`]]
          : []),
        ...(payment?.stripePaymentIntentId
          ? [["Stripe Reference", payment.stripePaymentIntentId]]
          : payment?.stripeSessionId
          ? [["Session ID", payment.stripeSessionId]]
          : []),
      ].map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <span className="text-slate-500 shrink-0">{label}</span>
          <span className="font-semibold text-ink text-right text-xs break-all">{value}</span>
        </div>
      ))}
      <div className="pt-2 border-t border-black/5 text-[11px] text-slate-500">
        Note: The Rs 200 booking fee is paid via FixPoint. Actual service charges are settled directly with the provider upon service completion.
      </div>
    </div>
  );
}

export default function CustomerPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const user = getUser();

  const [verifying, setVerifying] = useState(true);
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10; // 10 * 2s = 20s

    const checkBookingStatus = async () => {
      attempts++;
      try {
        const res = await httpClient.get("/customer/bookings?scope=upcoming");
        if (res.data?.success && Array.isArray(res.data.bookings)) {
          const match = res.data.bookings.find(
            (b) => b._id === bookingId || b.bookingId === bookingId
          );
          if (match && match.status === "confirmed") {
            setBooking(match);
            setVerifying(false);

            // Fetch payment record
            try {
              const pmtRes = await httpClient.get("/customer/payments?limit=5");
              if (pmtRes.data?.payments?.length > 0) {
                // Find payment matching booking or latest booking_fee
                const pMatch =
                  pmtRes.data.payments.find(
                    (p) => String(p.booking) === String(match._id) || String(p.booking?._id) === String(match._id)
                  ) || pmtRes.data.payments[0];
                setPayment(pMatch);
              }
            } catch (err) {
              console.error("Fetch customer payment error:", err);
            }
            return true;
          }
        }
      } catch (err) {
        console.error("Poll booking status error:", err);
      }

      if (attempts >= maxAttempts) {
        setVerifying(false);
        return true;
      }
      return false;
    };

    const intervalId = setInterval(async () => {
      const done = await checkBookingStatus();
      if (done) clearInterval(intervalId);
    }, 2000);

    // Initial check
    checkBookingStatus().then((done) => {
      if (done) clearInterval(intervalId);
    });

    return () => clearInterval(intervalId);
  }, [bookingId]);

  return (
    <CustomerLayout title="Booking Confirmed">
      <div className="mx-auto max-w-xl py-8">
        <div className="rounded-3xl bg-white p-8 shadow-xs border border-black/5 sm:p-10">
          {verifying ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pastel-blue text-blue-900">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h2 className="text-2xl font-extrabold text-ink">Confirming Your Booking...</h2>
              <p className="text-sm text-slate-500">
                Please wait a moment while we verify your Rs 200 booking fee payment with Stripe.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-4">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-extrabold text-ink">Booking Confirmed!</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Thank you! Your payment of <strong className="text-ink">Rs 200</strong> has been verified. Your service appointment is now locked in.
                </p>
              </div>

              {(payment || booking) && (
                <ReceiptView payment={payment} booking={booking} user={user} />
              )}

              {/* Print / Download PDF buttons */}
              <div className="flex gap-3 mt-4 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 btn-dark py-2.5 flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="h-4 w-4" /> Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 text-sm"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3 print:hidden">
                <Link to="/customer/bookings" className="btn-dark flex items-center justify-center gap-2">
                  View My Bookings <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/customer/payments" className="btn-primary flex items-center justify-center gap-2">
                  <ReceiptText className="h-4 w-4" /> View Receipts
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}