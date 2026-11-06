import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Download,
  Loader2,
  Printer,
  ReceiptText,
} from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import { httpClient } from "../../lib/http";
import { getUser } from "../../lib/local-storage";

function ReceiptView({ payment, user }) {
  if (!payment) return null;
  const receiptNo = `RCP-${payment._id?.slice(-8).toUpperCase()}`;
  const paidAt = payment.paidAt ? new Date(payment.paidAt) : new Date(payment.createdAt);

  return (
    <div className="rounded-2xl bg-soft/60 border border-black/5 p-5 text-sm space-y-2.5 text-left mt-4 print-receipt">
      <div className="flex justify-between items-center border-b border-black/5 pb-2 mb-2">
        <span className="font-extrabold text-ink">Official Receipt</span>
        <span className="text-xs text-slate-400 font-mono">{receiptNo}</span>
      </div>
      {[
        ["Payer", `${user?.firstName} ${user?.lastName}`],
        ["Role", "Provider"],
        ["Payment Type", "Registration Fee"],
        ["Amount", `Rs ${payment.amount?.toLocaleString()} ${payment.currency?.toUpperCase()}`],
        ["Status", "PAID ✓"],
        ["Date & Time", paidAt.toLocaleString("en-PK")],
        ...(payment.stripePaymentIntentId
          ? [["Stripe Reference", payment.stripePaymentIntentId]]
          : payment.stripeSessionId
          ? [["Session ID", payment.stripeSessionId]]
          : []),
      ].map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <span className="text-slate-500 shrink-0">{label}</span>
          <span className="font-semibold text-ink text-right text-xs break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ProviderPaymentSuccess() {
  const user = getUser();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    let attempts = 0;
    const maxAttempts = 10;

    const checkStatus = async () => {
      attempts++;
      try {
        // Verify directly with Stripe (works even if the webhook did not arrive)
        if (sessionId) {
          try {
            await httpClient.get(`/provider/registration-fee/verify?session_id=${sessionId}`);
          } catch (verifyErr) {
            console.error("Payment verify error:", verifyErr);
          }
        }
        const res = await httpClient.get("/provider/payment-status");
        if (res.data?.success && res.data.registrationFeePaid) {
          setConfirmed(true);
          setVerifying(false);
          // Try to get payment record for receipt
          try {
            const pmtRes = await httpClient.get("/provider/payments?limit=1");
            if (pmtRes.data?.payments?.[0]) setPayment(pmtRes.data.payments[0]);
          } catch {}
          return true;
        }
      } catch (err) {
        console.error("Payment status poll error:", err);
      }
      if (attempts >= maxAttempts) {
        setVerifying(false);
        return true;
      }
      return false;
    };

    const intervalId = setInterval(async () => {
      const done = await checkStatus();
      if (done) clearInterval(intervalId);
    }, 2000);

    checkStatus().then((done) => {
      if (done) clearInterval(intervalId);
    });

    return () => clearInterval(intervalId);
  }, []);

  return (
    <ProviderLayout title="Payment Confirmation">
      <div className="mx-auto max-w-xl py-8">
        <div className="rounded-3xl bg-white p-8 shadow-xs border border-black/5 sm:p-10">
          {verifying ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pastel-blue text-blue-900">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h2 className="text-2xl font-extrabold text-ink">Verifying Payment…</h2>
              <p className="text-sm text-slate-500">
                Please wait while we confirm your Rs 500 registration fee with Stripe.
              </p>
            </div>
          ) : confirmed ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-4">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-extrabold text-ink">Registration Fee Paid!</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Your payment of <strong className="text-ink">Rs 500</strong> has been verified. Your profile is now
                  active and visible to customers on FixPoint.
                </p>
              </div>

              {payment && <ReceiptView payment={payment} user={user} />}

              {/* Print/Download actions */}
              {payment && (
                <div className="flex gap-3 mt-2 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 btn-dark py-2.5 flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="h-4 w-4" /> Download PDF
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 text-sm"
                  >
                    <Printer className="h-4 w-4" /> Print
                  </button>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3 print:hidden">
                <Link to="/provider/availability" className="btn-primary flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4" /> Set Availability
                </Link>
                <Link to="/provider/payments" className="btn-dark flex items-center justify-center gap-2">
                  <ReceiptText className="h-4 w-4" /> View Receipts
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-extrabold text-ink">Payment Received</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your payment was received. We are finalizing confirmation. Your account status will update shortly.
              </p>
              <Link to="/provider/dashboard" className="btn-dark inline-flex items-center gap-2 mt-2">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </ProviderLayout>
  );
}