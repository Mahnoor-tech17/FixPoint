import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  CreditCard,
  Download,
  Loader2,
  Printer,
  ReceiptText,
  XCircle,
} from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import { getErrorMessage, httpClient } from "../../lib/http";
import { getUser } from "../../lib/local-storage";

const STATUS_STYLES = {
  paid: "bg-pastel-mint text-emerald-900 border-emerald-200",
  pending: "bg-pastel-yellow text-amber-900 border-amber-200",
  failed: "bg-pastel-pink text-rose-900 border-rose-200",
  refunded: "bg-pastel-blue text-blue-900 border-blue-200",
};

const TYPE_LABELS = {
  provider_registration: "Registration Fee",
  booking_fee: "Booking Fee",
};

function Row({ label, value, mono = false, small = false }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span
        className={`font-semibold text-ink text-right ${mono ? "font-mono" : ""} ${
          small ? "text-xs break-all" : ""
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function ReceiptModal({ payment, user, onClose }) {
  const receiptNo = `RCP-${payment._id?.slice(-8).toUpperCase()}`;
  const paidAt = payment.paidAt ? new Date(payment.paidAt) : new Date(payment.createdAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:bg-white print:p-0">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-black/5 sm:p-8 print:shadow-none print:rounded-none print:max-w-none">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-ink">FixPoint Receipt</h2>
            <p className="text-xs text-slate-500 mt-0.5">{receiptNo}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full print:hidden">
            <XCircle className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="flex justify-center mb-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <span className="text-sm font-bold text-emerald-700">Payment Successful</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <p className="text-4xl font-extrabold text-ink">Rs {payment.amount?.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{payment.currency?.toUpperCase()}</p>
        </div>

        <div className="rounded-2xl bg-soft/60 p-4 space-y-3 text-sm mb-6">
          <Row label="Receipt No." value={receiptNo} mono />
          <Row label="Date & Time" value={paidAt.toLocaleString("en-PK")} />
          <Row label="Payer" value={`${user?.firstName} ${user?.lastName}`} />
          <Row label="Role" value="Provider" />
          <Row label="Payment Type" value={TYPE_LABELS[payment.type] || payment.type} />
          <Row label="Status" value={payment.status?.toUpperCase()} />
          {payment.stripePaymentIntentId && (
            <Row label="Stripe Reference" value={payment.stripePaymentIntentId} mono small />
          )}
          {payment.stripeSessionId && !payment.stripePaymentIntentId && (
            <Row label="Session ID" value={payment.stripeSessionId} mono small />
          )}
          {payment.type === "provider_registration" && (
            <Row label="Purpose" value="One-time platform registration fee" />
          )}
        </div>

        <div className="flex gap-3 print:hidden">
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
      </div>
    </div>
  );
}

export default function ProviderPayments() {
  const user = getUser();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [selectedPayment, setSelectedPayment] = useState(null);

  const fetchPayments = async (page = 1) => {
    try {
      setLoading(true);
      const res = await httpClient.get(`/provider/payments?page=${page}&limit=20`);
      setPayments(res.data.payments || []);
      setPagination(res.data.pagination || { total: 0, page: 1, pages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <ProviderLayout title="Payments & Receipts">
      <div className="space-y-6">
        <div className="rounded-3xl bg-pastel-blue p-6 border border-blue-100 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-900 shadow-xs">
              <ReceiptText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-ink">My Payments & Receipts</h2>
              <p className="text-sm text-slate-600 mt-0.5">
                View receipts for your registration fee and other payments.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white shadow-xs border border-black/5">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pastel-yellow text-amber-900 mb-4">
                <CreditCard className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-ink">No payments yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Your registration fee receipt will appear here after payment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-black/5 bg-soft/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {payments.map((pmt) => {
                    const statusStyle = STATUS_STYLES[pmt.status] || "bg-slate-100 text-slate-700";
                    return (
                      <tr key={pmt._id} className="hover:bg-soft/30 transition">
                        <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                          {new Date(pmt.createdAt).toLocaleDateString("en-PK")}
                        </td>
                        <td className="px-6 py-4 font-semibold text-ink">
                          {TYPE_LABELS[pmt.type] || pmt.type}
                        </td>
                        <td className="px-6 py-4 font-bold text-ink">
                          Rs {pmt.amount?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${statusStyle}`}
                          >
                            {pmt.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {pmt.status === "paid" && (
                            <button
                              onClick={() => setSelectedPayment(pmt)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-pastel-mint text-emerald-900 px-3 py-1 text-xs font-bold hover:bg-emerald-100 transition"
                            >
                              <ReceiptText className="h-3.5 w-3.5" /> View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => fetchPayments(p)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  p === pagination.page
                    ? "bg-ink text-white"
                    : "bg-white text-ink border border-black/10 hover:bg-soft"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedPayment && (
        <ReceiptModal
          payment={selectedPayment}
          user={user}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </ProviderLayout>
  );
}
